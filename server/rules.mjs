export const FAUNA={'Ásia':['Tigre','Panda','Pavão'],'África':['Leão','Elefante','Zebra'],'Europa':['Lobo','Raposa','Corvo'],'América do Norte':['Urso','Águia','Bisão'],'América do Sul':['Onça','Arara','Capivara'],'Oceania':['Canguru','Coala','Emu'],'Antártida':['Pinguim','Foca','Albatroz']};
export const TICK_MS=50;
export function validateCharacter(value){if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>24||!FAUNA[value.continent]?.includes(value.animal))throw Error('invalid_character');return{name:value.name.trim(),continent:value.continent,animal:value.animal};}
export function parseIntent(raw){
  if(typeof raw!=='string'||raw.length>2048)throw Error('invalid_message');
  const v=JSON.parse(raw);
  if(!v||!['move','collect','craft','attack','morph','potion','pet','raid','hunt','attribute','rest','equip','form','disguise','skill'].includes(v.type))throw Error('invalid_intent');
  if(v.type==='move'&&(!Number.isFinite(v.dx)||!Number.isFinite(v.dz)||Math.abs(v.dx)>1||Math.abs(v.dz)>1))throw Error('invalid_move');
  if(['collect','attack'].includes(v.type)&&(typeof v.target!=='string'||v.target.length>100))throw Error('invalid_target');
  if(v.type==='pet'&&!['luta','trabalho','magia'].includes(v.mode))throw Error('invalid_pet');
  if(v.type==='attribute'&&!['vitality','power','spirit'].includes(v.stat))throw Error('invalid_stat');
  if(['skill','equip'].includes(v.type)&&![1,2].includes(v.slot))throw Error('invalid_slot');
  if(v.type==='equip'&&!['mend','pulse','veil','shadow'].includes(v.skill))throw Error('invalid_skill');
  if(v.type==='skill'&&v.target!==undefined&&(typeof v.target!=='string'||v.target.length>100))throw Error('invalid_target');
  if(v.type==='form'&&!['origin','madregona'].includes(v.form))throw Error('invalid_form');
  if(v.type==='disguise'&&(typeof v.animal!=='string'||v.animal.length>24))throw Error('invalid_disguise');
  return v;
}
export function movement(c,v,now){const length=Math.max(1,Math.hypot(v.dx,v.dz));const dt=Math.min(.15,Math.max(0,(now-c.last_move)/1000));const climate=Math.floor(now/40000)%3;const friction=[.75,.85,.55][climate];const speed=3.3*friction*(c.morph_until>now?1.65:1);return{x:Math.max(-13,Math.min(13,c.x+v.dx/length*speed*dt)),z:Math.max(-13,Math.min(13,c.z+v.dz/length*speed*dt))};}
export const near=(a,b,range=2.5)=>Math.hypot(a.x-b.x,a.z-b.z)<=range;
export function canAttack(a,b,range=2.5){return a.id!==b.id&&a.continent===b.continent&&a.nation_id!==b.nation_id&&a.z>4&&b.z>4&&near(a,b,range);}
