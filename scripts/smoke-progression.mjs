import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

// Plays through the real protocol. No admin grants, database edits or forged rewards.
const origin=process.argv[2];
if(!origin||!process.argv.includes('--create-test-account'))throw Error('Usage: node scripts/smoke-progression.mjs <exact-origin> --create-test-account');
assert.equal(new URL(origin).origin,origin);
let cookie='',socket,snapshot,errors=[],waiters=new Set();
const self=()=>snapshot?.players.find(p=>p.id===snapshot.self);
async function api(path,data){
  const response=await fetch(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok,path+': HTTP '+response.status);return response;
}
function wait(predicate,timeout=15000){
  if(predicate())return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const check=()=>{if(predicate()){clearTimeout(timer);waiters.delete(check);resolve();}};
    const timer=setTimeout(()=>{waiters.delete(check);reject(Error('Timed out waiting for gameplay snapshot'));},timeout);
    waiters.add(check);
  });
}
async function command(intent,predicate){socket.send(JSON.stringify(intent));await wait(predicate);}
async function rejected(intent,code){const start=errors.length;await command(intent,()=>errors.slice(start).includes(code));}
async function walk(x,z){
  for(let step=0;step<180;step++){
    const c=self(),dx=x-c.x,dz=z-c.z,length=Math.hypot(dx,dz);if(length<.45)return;
    await delay(80);const previous={x:c.x,z:c.z};
    await command({type:'move',dx:dx/length,dz:dz/length},()=>Math.hypot(self().x-previous.x,self().z-previous.z)>.001);
  }
  throw Error('Could not reach gameplay destination');
}
try{
  const credentials={email:'qa-madregona-'+randomUUID()+'@example.invalid',password:randomUUID()+randomUUID()};
  const registered=await api('register',credentials);cookie=registered.headers.get('set-cookie').split(';')[0];
  await api('characters',{name:'Madregona QA',continent:'América do Sul',animal:'Onça'});
  const {characters}=await (await api('characters')).json();const character=characters[0];
  const {ticket}=await (await api('ticket',{character_id:character.id})).json();
  const url=new URL('/api/ws',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',ticket);
  socket=new WebSocket(url,{origin,headers:{Cookie:cookie}});
  socket.on('error',error=>{console.error('WebSocket:',error.message);});
  socket.on('message',raw=>{
    const data=JSON.parse(String(raw));if(data.type==='snapshot')snapshot=data;if(data.type==='error')errors.push(data.error);
    for(const check of [...waiters])check();
  });
  await wait(()=>!!snapshot);assert.equal(snapshot.progression.xp,0);
  for(let value=1;value<=3;value++)await command({type:'attribute',stat:'power',amount:999},()=>snapshot.progression.power===value);
  await rejected({type:'attribute',stat:'power'},'no_attribute_points');
  await rejected({type:'form',form:'madregona'},'locked_form');
  await command({type:'hunt'},()=>snapshot.madregona?.hp===180);
  console.log('PASS: initial attribute budget, locked form and disguised encounter. Walking to the frontier...');
  await walk(6,7);await rejected({type:'rest'},'sanctuary_required');
  await command({type:'skill',slot:2,target:'madregona',damage:99999},()=>snapshot.madregona?.revealed===1);
  assert.ok(snapshot.madregona.hp>0);
  for(let hit=0;hit<10&&snapshot.madregona.hp>0;hit++){
    const hp=snapshot.madregona.hp;await delay(600);
    await command({type:'attack',target:'madregona',damage:99999},()=>snapshot.madregona.hp<hp);
  }
  assert.equal(snapshot.madregona.hp,0);assert.equal(snapshot.progression.madregona_unlocked,1);assert.equal(snapshot.progression.xp,250);
  await command({type:'form',form:'madregona'},()=>snapshot.progression.active_form==='madregona');
  await command({type:'disguise',animal:'Arara'},()=>snapshot.progression.disguise_animal==='Arara');assert.equal(self().animal,'Onça');
  await rejected({type:'attribute',stat:'vitality'},'sanctuary_required');
  await rejected({type:'hunt'},'encounter_cooldown');
  console.log('PASS: legitimate combat, shadow pulses, 250 XP, form unlock and cosmetic disguise. Returning to sanctuary...');
  await walk(6,-2);
  await command({type:'attribute',stat:'vitality'},()=>snapshot.progression.vitality===1);
  await command({type:'rest'},()=>snapshot.inventory.hp===110&&snapshot.progression.energy===60);
  await command({type:'equip',slot:1,skill:'veil'},()=>snapshot.progression.skill_a==='veil');
  await command({type:'skill',slot:1},()=>snapshot.progression.veil_until>snapshot.server_time);
  await rejected({type:'skill',slot:1},'skill_cooldown');
  assert.ok(snapshot.progression.energy<60);
  console.log('PASS: level-derived HP, sanctuary recovery, skill equipment, shadow shield, energy and cooldown.');
}finally{
  if(socket)socket.close();
  if(cookie)await api('logout',{});
}
