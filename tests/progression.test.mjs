import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import '../dist/progression.js';
import { parseIntent } from '../server/rules.mjs';
import { characterAction, startMadregona, madregonaHit, advanceMadregona } from '../server/character-actions.mjs';
import { ContinentRoom } from '../server/index.ts';
const P=globalThis.AtmosProgression;

function database(){
  const raw=new DatabaseSync(':memory:');
  for(const file of readdirSync('server/migrations').sort())raw.exec(readFileSync('server/migrations/'+file,'utf8'));
  raw.exec("INSERT INTO accounts VALUES('a','a@test.invalid','h','s',0);INSERT INTO nations(id,name,continent) VALUES('n1','Aurora','África'),('n2','Maré','África');INSERT INTO characters(id,account_id,name,continent,animal,nation_id) VALUES('c','a','Centelha','África','Leão','n1'),('other','a','Outro','África','Zebra','n2');");
  const prepare=(sql,args=[])=>({bind(...values){return prepare(sql,values);},async first(){return raw.prepare(sql).get(...args)||null;},async all(){return{results:raw.prepare(sql).all(...args)};},async run(){return raw.prepare(sql).run(...args);}});
  return{raw,prepare,async batch(statements){raw.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}},character(id='c'){return raw.prepare('SELECT * FROM characters WHERE id=?').get(id);},enemy(){return raw.prepare("SELECT * FROM madregona_encounters WHERE character_id='c'").get();}};
}

test('legacy characters retain their identity, inventory and HP after migration',()=>{
  const db=new DatabaseSync(':memory:');db.exec(readFileSync('server/migrations/0001_initial.sql','utf8'));
  db.exec("INSERT INTO accounts VALUES('a','e@test.invalid','h','s',0);INSERT INTO nations(id,name,continent) VALUES('n','Aurora','África');INSERT INTO characters(id,account_id,name,continent,animal,nation_id,hp,coin) VALUES('c','a','Nome','África','Leão','n',63,17)");
  db.exec(readFileSync('server/migrations/0002_madregona_progression.sql','utf8'));
  const c=db.prepare('SELECT * FROM characters').get();assert.equal(c.hp,63);assert.equal(c.coin,17);assert.equal(c.animal,'Leão');assert.equal(c.xp,0);assert.equal(P.points(c),3);assert.equal(c.active_form,'origin');
});
test('level thresholds, permanent attribute budget and maximum HP are consistent',()=>{
  assert.deepEqual([0,99,100,299,300,19000,999999].map(P.level),[1,1,2,2,3,20,20]);
  const db=database();db.raw.exec("UPDATE characters SET vitality=3 WHERE id='c'");assert.equal(P.maxHP(db.character()),130);
  assert.throws(()=>db.raw.exec("UPDATE characters SET power=1 WHERE id='c'"),/attribute_budget/);
  db.raw.exec("UPDATE characters SET xp=100,power=3 WHERE id='c'");assert.equal(P.points(db.character()),0);
  assert.throws(()=>parseIntent(JSON.stringify({type:'attribute',stat:'xp'})),/invalid_stat/);
  assert.throws(()=>parseIntent(JSON.stringify({type:'skill',slot:0})),/invalid_slot/);
});
test('server rejects locked forms, shadow skills and training outside the sanctuary',async()=>{
  const db=database(),room={sockets:new Map()};
  await assert.rejects(characterAction(db,db.character(),{type:'form',form:'madregona'},10000,room),/locked_form/);
  await assert.rejects(characterAction(db,db.character(),{type:'equip',slot:1,skill:'shadow'},10000,room),/locked_skill/);
  db.raw.exec("UPDATE characters SET z=7 WHERE id='c'");
  await assert.rejects(characterAction(db,db.character(),{type:'attribute',stat:'vitality'},10000,room),/sanctuary_required/);
  assert.equal(db.character().vitality,0);
});
test('healing obeys max HP, energy and skill cooldown even if slots change',async()=>{
  const db=database(),room={sockets:new Map()};db.raw.exec("UPDATE characters SET hp=30,vitality=3 WHERE id='c'");
  await characterAction(db,db.character(),{type:'skill',slot:1},10000,room);
  assert.equal(db.character().hp,55);assert.equal(db.character().energy,40);
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:1},10001,room),/skill_cooldown/);
  db.raw.exec("UPDATE characters SET skill_a='pulse',skill_b='mend' WHERE id='c'");
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:2},10001,room),/skill_cooldown/);
  db.raw.exec("UPDATE characters SET energy=0,energy_updated=20000 WHERE id='c'");
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:2},20000,room),/insufficient_energy/);
  assert.equal(P.energy(db.character(),22000),10);
});
test('Madregona belongs to its challenger, reveals on hit and grants a form exactly once',async()=>{
  const db=database();await startMadregona(db,db.character(),10000);
  assert.equal(db.enemy().revealed,0);
  const room=new ContinentRoom({}, {DB:db}),ws={send(){},close(){}};room.sockets.set(ws,{id:'c',count:0,start:Date.now()});
  await assert.rejects(room.handle(ws,JSON.stringify({type:'attack',target:'madregona',damage:999999})),/out_of_range/);
  db.raw.exec("UPDATE characters SET x=6,z=7,last_attack=0 WHERE id='c'");
  await room.handle(ws,JSON.stringify({type:'attack',target:'madregona',damage:999999}));
  assert.equal(db.enemy().hp,160);assert.equal(db.enemy().revealed,1);
  await db.batch(madregonaHit(db,db.character(),160,12000));
  assert.equal(db.enemy().hp,0);assert.equal(db.character().xp,250);assert.equal(db.character().madregona_unlocked,1);
  await db.batch(madregonaHit(db,db.character(),99999,13000));assert.equal(db.character().xp,250);
  await assert.rejects(startMadregona(db,db.character(),13000),/encounter_cooldown/);
  await assert.rejects(characterAction(db,db.character('other'),{type:'skill',slot:2,target:'madregona'},20000,room),/out_of_range/);
  assert.equal(db.character('other').energy,60);
});
test('shadow pulses are idempotent, shieldable and death preserves progression and unlocked form',async()=>{
  const db=database();await startMadregona(db,db.character(),10000);
  db.raw.exec("UPDATE characters SET x=6,z=7,hp=50,xp=1000,vitality=2,madregona_unlocked=1,active_form='madregona',veil_until=30000 WHERE id='c';UPDATE madregona_encounters SET revealed=1 WHERE character_id='c'");
  const c=db.character(),enemy=db.enemy();
  await advanceMadregona(db,[c],[enemy],14000);assert.equal(db.character().hp,44);
  await advanceMadregona(db,[c],[enemy],14000);assert.equal(db.character().hp,44);
  db.raw.exec("UPDATE characters SET hp=5,veil_until=0 WHERE id='c'");
  await advanceMadregona(db,[db.character()],[db.enemy()],18000);
  const next=db.character();assert.equal(next.hp,120);assert.equal(next.xp,1000);assert.equal(next.madregona_unlocked,1);assert.equal(next.active_form,'origin');assert.equal(next.z,-3);assert.equal(db.enemy().hp,180);assert.equal(db.enemy().revealed,0);
});
test('cosmetic disguises preserve DNA and shadow damage requires a conquered active form',async()=>{
  const db=database(),room={sockets:new Map()};db.raw.exec("UPDATE characters SET madregona_unlocked=1 WHERE id='c'");
  await characterAction(db,db.character(),{type:'form',form:'madregona'},10000,room);
  await characterAction(db,db.character(),{type:'disguise',animal:'Arara'},10000,room);
  assert.equal(db.character().animal,'Leão');assert.equal(db.character().continent,'África');assert.equal(db.character().disguise_animal,'Arara');
  await characterAction(db,db.character(),{type:'equip',slot:1,skill:'veil'},10000,room);
  await characterAction(db,db.character(),{type:'skill',slot:1},10000,room);assert.equal(db.character().veil_until,16000);
  await characterAction(db,db.character(),{type:'form',form:'origin'},10001,room);
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:1},25000,room),/shadow_form_required/);
});
test('lethal reward batch rolls back on failure, so a retry cannot duplicate experience',async()=>{
  const db=database();await startMadregona(db,db.character(),10000);
  db.raw.exec("CREATE TRIGGER simulate_failure BEFORE UPDATE OF hp ON madregona_encounters BEGIN SELECT RAISE(ABORT,'simulated'); END");
  await assert.rejects(db.batch(madregonaHit(db,db.character(),180,12000)),/simulated/);
  assert.equal(db.character().xp,0);assert.equal(db.character().madregona_unlocked,0);assert.equal(db.enemy().hp,180);
  db.raw.exec('DROP TRIGGER simulate_failure');await db.batch(madregonaHit(db,db.character(),180,12000));assert.equal(db.character().xp,250);
});

test('encounter damage survives a new room and private progression is only sent to its owner',async()=>{
  const db=database();await startMadregona(db,db.character(),Date.now());await db.batch(madregonaHit(db,db.character(),20,Date.now()));
  db.raw.exec("UPDATE characters SET power=3 WHERE id='c'");
  const room=new ContinentRoom({}, {DB:db});const messages=[[],[]];
  for(const [i,id] of ['c','other'].entries())room.sockets.set({send(raw){messages[i].push(JSON.parse(raw));}},{id,count:0,start:Date.now()});
  await room.broadcast();
  assert.equal(messages[0][0].madregona.hp,160);assert.equal(messages[1][0].madregona,null);
  assert.equal(messages[0][0].progression.power,3);assert.equal(messages[1][0].progression.power,0);
  for(const row of messages[1][0].players){assert.equal('xp' in row,false);assert.equal('energy' in row,false);}
});

test('offensive skills can finish the guardian and share its idempotent reward transaction',async()=>{
  const db=database();db.raw.exec("UPDATE characters SET x=0,z=7 WHERE id='c'");
  const room={sockets:new Map(),raid:{id:'raid-test',hp:20,ends:90000,participants:new Set()}};
  await characterAction(db,db.character(),{type:'skill',slot:2,target:'boss'},10000,room);
  assert.equal(room.raid,null);assert.equal(db.character().cards,1);assert.equal(db.character().xp,150);assert.equal(db.character().energy,45);
  room.raid={id:'raid-test',hp:20,ends:90000,participants:new Set()};
  await characterAction(db,db.character(),{type:'skill',slot:2,target:'boss'},15000,room);
  assert.equal(db.character().cards,1);assert.equal(db.character().xp,150);
});

test('PvP skills respect active opponents, frontier, affiliation and shadow shields',async()=>{
  const db=database();db.raw.exec("UPDATE characters SET x=0,z=7;UPDATE characters SET veil_until=20000 WHERE id='other'");
  const room={sockets:new Map([[{}, {id:'other'}]])};
  await characterAction(db,db.character(),{type:'skill',slot:2,target:'other'},10000,room);
  assert.equal(db.character('other').hp,87);
  db.raw.exec("UPDATE characters SET nation_id='n1' WHERE id='other'");
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:2,target:'other'},15000,room),/out_of_range/);
  db.raw.exec("UPDATE characters SET nation_id='n2',z=0 WHERE id='other'");
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:2,target:'other'},15000,room),/out_of_range/);
  db.raw.exec("UPDATE characters SET z=7 WHERE id='other'");room.sockets.clear();
  await assert.rejects(characterAction(db,db.character(),{type:'skill',slot:2,target:'other'},15000,room),/out_of_range/);
  assert.equal(db.character('other').hp,87);assert.equal(db.character().skill_pulse_at,10000);
});
