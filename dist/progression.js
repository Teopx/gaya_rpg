'use strict';
// Shared, immutable rules. Server and solo client use the same calculations.
globalThis.AtmosProgression = Object.freeze((() => {
  const skills = Object.freeze({
    mend: Object.freeze({ name:'Sopro restaurador', cost:20, cooldown:8000, kind:'heal', description:'Recupera 25 HP + 3 por ponto de Espírito.' }),
    pulse: Object.freeze({ name:'Pulso da centelha', cost:15, cooldown:4000, kind:'attack', description:'25 de dano + 2 por Espírito e por Poder. Alcance: 3.' }),
    veil: Object.freeze({ name:'Véu de sombras', cost:25, cooldown:12000, kind:'shield', shadow:true, description:'Na forma Madregona, reduz o dano recebido pela metade por 6 s.' }),
    shadow: Object.freeze({ name:'Garra umbral', cost:25, cooldown:6000, kind:'attack', shadow:true, description:'Na forma Madregona, causa 35 de dano + 3 por Espírito. Alcance: 3.' }),
  });
  const integer = (value, max=10000000) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  const level = xp => Math.min(20, Math.floor((1 + Math.sqrt(1 + 4 * integer(xp) / 50)) / 2));
  const threshold = value => 50 * value * (value - 1);
  const maxHP = c => 100 + integer(c?.vitality,60) * 10;
  const maxEnergy = c => 60 + integer(c?.spirit,60) * 5;
  const points = c => Math.max(0, level(c?.xp) * 3 - integer(c?.vitality,60) - integer(c?.power,60) - integer(c?.spirit,60));
  const energy = (c,now) => Math.min(maxEnergy(c), Math.max(0,Number(c?.energy ?? 60)) + Math.min(120,Math.max(0,(now - Number(c?.energy_updated || now))/1000)) * 5);
  function prepare(c) {
    for (const key of ['xp','vitality','power','spirit','madregona_unlocked']) c[key]=integer(c[key],key==='xp'?10000000:key==='madregona_unlocked'?1:60);
    c.energy=Math.min(maxEnergy(c),Number.isFinite(c.energy)?Math.max(0,c.energy):maxEnergy(c));
    c.energy_updated=Number.isFinite(c.energy_updated)?c.energy_updated:0;
    c.active_form=c.active_form==='madregona'&&c.madregona_unlocked?'madregona':'origin';
    c.skill_a=skills[c.skill_a]?c.skill_a:'mend';c.skill_b=skills[c.skill_b]?c.skill_b:'pulse';
    for (const id of Object.keys(skills)) c['skill_'+id+'_at']=Number(c['skill_'+id+'_at'])||0;
    c.veil_until=Number(c.veil_until)||0;c.disguise_animal=String(c.disguise_animal||'');
    return c;
  }
  function skillUse(c,slot,now) {
    const id=slot===1?c.skill_a:c.skill_b,skill=skills[id];
    if (!skill) throw Error('invalid_skill');
    if (skill.shadow && (!c.madregona_unlocked || c.active_form!=='madregona')) throw Error('shadow_form_required');
    const last=Number(c['skill_'+id+'_at'])||0;
    if (last>0 && now-last<skill.cooldown) throw Error('skill_cooldown');
    const available=energy(c,now);if (available<skill.cost) throw Error('insufficient_energy');
    return {id,skill,remaining:available-skill.cost,damage:id==='shadow'?35+integer(c.spirit)*3:25+integer(c.spirit)*2+integer(c.power)*2};
  }
  function allocate(c,stat) {
    if (!['vitality','power','spirit'].includes(stat) || points(c)<1 || integer(c[stat])>=60) throw Error('no_attribute_points');
    if (c.z>4) throw Error('sanctuary_required');
    c[stat]=integer(c[stat])+1;return c;
  }
  return {skills,integer,level,threshold,maxHP,maxEnergy,points,energy,prepare,skillUse,allocate};
})());
