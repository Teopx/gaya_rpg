import '../dist/progression.js';
import { FAUNA, near, canAttack } from './rules.mjs';
const P = globalThis.AtmosProgression;
const skillColumns = Object.freeze({mend:'skill_mend_at',pulse:'skill_pulse_at',veil:'skill_veil_at',shadow:'skill_shadow_at'});

export async function startMadregona(db,c,now) {
  const existing=await db.prepare('SELECT * FROM madregona_encounters WHERE character_id=?').bind(c.id).first();
  if (existing?.hp>0) return;
  if (existing && now-existing.defeated_at<180000) throw Error('encounter_cooldown');
  const animal=FAUNA[c.continent][Math.floor(now/1000)%FAUNA[c.continent].length];
  await db.prepare(`INSERT INTO madregona_encounters(character_id,continent,disguise_animal,last_pulse) VALUES(?,?,?,?) ON CONFLICT(character_id) DO UPDATE SET hp=180,revealed=0,last_pulse=excluded.last_pulse,defeated_at=0,disguise_animal=excluded.disguise_animal`).bind(c.id,c.continent,animal,now).run();
}

export async function madregonaTarget(db,c) {
  const enemy=await db.prepare('SELECT * FROM madregona_encounters WHERE character_id=? AND continent=? AND hp>0').bind(c.id,c.continent).first();
  return enemy && c.z>4 && near(c,enemy,3) ? enemy : null;
}

export function madregonaHit(db,c,damage,now) {
  // Reward is checked against the still-live encounter, before damage, in ONE batch.
  return [
    db.prepare(`UPDATE characters SET xp=xp+CASE WHEN madregona_unlocked=0 THEN 250 ELSE 50 END,madregona_unlocked=1 WHERE id=? AND EXISTS(SELECT 1 FROM madregona_encounters WHERE character_id=? AND hp>0 AND hp<=?)`).bind(c.id,c.id,damage),
    db.prepare('UPDATE madregona_encounters SET hp=MAX(0,hp-?),revealed=1,defeated_at=CASE WHEN hp<=? THEN ? ELSE 0 END WHERE character_id=? AND hp>0').bind(damage,damage,now,c.id),
  ];
}

export async function raidHit(db,c,damage,now,room,payments=[]) {
  const raid=room.raid;
  if(!raid||raid.ends<now||c.z<=4||!near(c,{x:0,z:7},3))throw Error('out_of_range');
  const hp=raid.hp-damage,participants=new Set([...raid.participants,c.id]),statements=[...payments];
  if(hp<=0)for(const id of participants){
    statements.push(db.prepare('UPDATE characters SET cards=cards+1,coin=coin+10,xp=xp+150 WHERE id=? AND NOT EXISTS(SELECT 1 FROM raid_rewards WHERE raid_id=? AND character_id=?)').bind(id,raid.id,id));
    statements.push(db.prepare('INSERT OR IGNORE INTO raid_rewards VALUES(?,?)').bind(raid.id,id));
  }
  if(statements.length)await db.batch(statements);
  room.raid=hp<=0?null:{...raid,hp,participants};
}

export async function characterAction(db,c,intent,now,room) {
  if (intent.type==='hunt') { await startMadregona(db,c,now); return true; }
  if (intent.type==='attribute') {
    P.allocate(c,intent.stat);
    const columns={vitality:'vitality',power:'power',spirit:'spirit'};
    const column=columns[intent.stat];
    await db.prepare(`UPDATE characters SET ${column}=${column}+1 WHERE id=?`).bind(c.id).run();return true;
  }
  if (intent.type==='rest') {
    if(c.z>4)throw Error('sanctuary_required');
    await db.prepare('UPDATE characters SET hp=100+vitality*10,energy=60+spirit*5,energy_updated=? WHERE id=?').bind(now,c.id).run();return true;
  }
  if (intent.type==='equip') {
    if(c.z>4)throw Error('sanctuary_required');
    const skill=P.skills[intent.skill];
    if(!skill || (skill.shadow&&!c.madregona_unlocked))throw Error('locked_skill');
    if((intent.slot===1?c.skill_b:c.skill_a)===intent.skill)throw Error('duplicate_skill');
    await db.prepare(`UPDATE characters SET ${intent.slot===1?'skill_a':'skill_b'}=? WHERE id=?`).bind(intent.skill,c.id).run();return true;
  }
  if (intent.type==='form') {
    if(intent.form==='madregona'&&!c.madregona_unlocked)throw Error('locked_form');
    await db.prepare("UPDATE characters SET active_form=?,disguise_animal='',veil_until=0 WHERE id=?").bind(intent.form,c.id).run();return true;
  }
  if (intent.type==='disguise') {
    if(!c.madregona_unlocked||c.active_form!=='madregona'||(intent.animal!==''&&!Object.values(FAUNA).flat().includes(intent.animal)))throw Error('invalid_disguise');
    await db.prepare('UPDATE characters SET disguise_animal=? WHERE id=?').bind(intent.animal,c.id).run();return true;
  }
  if (intent.type!=='skill')return false;
  const use=P.skillUse(c,intent.slot,now),statements=[];
  const payment=db.prepare(`UPDATE characters SET energy=?,energy_updated=?,${skillColumns[use.id]}=? WHERE id=?`).bind(use.remaining,now,now,c.id);
  if(use.skill.kind==='heal') {
    if(c.hp>=P.maxHP(c))throw Error('full_health');
    statements.push(db.prepare('UPDATE characters SET hp=MIN(100+vitality*10,hp+25+spirit*3) WHERE id=?').bind(c.id));
  } else if(use.skill.kind==='shield') {
    statements.push(db.prepare('UPDATE characters SET veil_until=? WHERE id=?').bind(now+6000,c.id));
  } else {
    // The encounter is personal; all range, ownership and damage checks are server-side.
    if(intent.target==='madregona') {
      if(!await madregonaTarget(db,c))throw Error('out_of_range');
      statements.push(...madregonaHit(db,c,use.damage,now));
    } else if(intent.target==='boss') {
      await raidHit(db,c,use.damage,now,room,[payment]);return true;
    } else {
      const target=await db.prepare('SELECT * FROM characters WHERE id=?').bind(intent.target).first();
      if(!target||!Array.from(room.sockets.values()).some(p=>p.id===target.id)||!canAttack(c,target,3))throw Error('out_of_range');
      const damage=target.veil_until>now?Math.ceil(use.damage/2):use.damage;
      statements.push(db.prepare('UPDATE characters SET hp=hp-? WHERE id=?').bind(damage,target.id));
    }
  }
  statements.unshift(payment);
  await db.batch(statements);return true;
}

export async function advanceMadregona(db,characters,encounters,now) {
  const statements=[];
  for(const enemy of encounters) {
    const c=characters.find(c=>c.id===enemy.character_id);
    if(!c||enemy.hp<=0||!enemy.revealed||now-enemy.last_pulse<3000||c.z<=4||!near(c,enemy,4))continue;
    const damage=c.veil_until>now?6:12;
    statements.push(db.prepare('UPDATE characters SET hp=hp-? WHERE id=? AND EXISTS(SELECT 1 FROM madregona_encounters WHERE character_id=? AND hp>0 AND revealed=1 AND last_pulse<=?)').bind(damage,c.id,c.id,now-3000));
    statements.push(db.prepare('UPDATE madregona_encounters SET last_pulse=? WHERE character_id=? AND hp>0 AND revealed=1 AND last_pulse<=?').bind(now,c.id,now-3000));
  }
  if(statements.length)await db.batch(statements);
  return statements.length>0;
}
