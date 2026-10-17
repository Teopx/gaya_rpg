'use strict';
// UI and solo commands. Online commands are validated and persisted by the Worker.
function gameNow(){return online?clock*1000:Date.now();}
function gainXP(amount){const before=P.level(player.xp);player.xp=(player.xp||0)+amount;if(P.level(player.xp)>before)notice('Sua centelha cresceu. Novo nível e 3 pontos de atributo!');}
function characterUI(){
  const c=player;if(c)P.prepare(c);
  const level=P.level(c?.xp),hpMax=P.maxHP(c),energy=P.energy(c||{},gameNow());
  $('#levelBadge').textContent='NÍVEL '+level+' · '+P.points(c)+' pontos';
  $('#sheetName').textContent=c?.name||'Seu vivente';
  $('#sheetLevel').textContent='Nível '+level+' · '+(c?.xp||0)+' XP';
  $('#sheetHP').textContent=Math.ceil(c?.hp??hpMax)+' / '+hpMax+' HP';
  $('#sheetEnergy').textContent=Math.floor(energy)+' / '+P.maxEnergy(c)+' energia';
  $('#energyText').textContent=Math.floor(energy)+' / '+P.maxEnergy(c)+' · Energia';
  $('#energyBar').style.width=(energy/P.maxEnergy(c)*100)+'%';
  $('#xpProgress').max=level===20?1:P.threshold(level+1)-P.threshold(level);
  $('#xpProgress').value=level===20?1:(c?.xp||0)-P.threshold(level);
  $('#xpNext').textContent=level===20?'Nível máximo desta era':(P.threshold(level+1)-(c?.xp||0))+' XP para o próximo nível';
  $('#availablePoints').textContent=P.points(c)+' pontos disponíveis';
  for(const [stat,label] of [['vitality','Vitality'],['power','Power'],['spirit','Spirit']]){
    $('#value'+label).textContent=c?.[stat]||0;
    $('#add'+label).disabled=!c||P.points(c)<1||c.z>4;
  }
  $('#derivedStats').textContent='HP máximo '+hpMax+' · ataque básico '+((morphUntil>clock?40:20)+P.integer(c?.power)*2+(c?.pet==='luta'?10:0))+' · energia máxima '+P.maxEnergy(c);
  $('#rest').disabled=!c||c.z>4;
  $('#sheetPotion').disabled=!c||!bag().potion||c.hp>=hpMax;
  $('#sheetMode').textContent=online?'Online: o mundo continua enquanto você consulta a ficha. Atributos e equipamentos só mudam no santuário.':'Solo: movimento e combate pausam nesta ficha. Distribua pontos e equipe habilidades no santuário.';
  for(const slot of [1,2]){
    const id=c?.[slot===1?'skill_a':'skill_b']|| (slot===1?'mend':'pulse'),skill=P.skills[id];
    const remaining=Math.max(0,skill.cooldown-(gameNow()-(c?.['skill_'+id+'_at']||0)));
    $('#skill'+slot+'Name').textContent=skill.name;
    $('#skill'+slot+'State').textContent=remaining>0?Math.ceil(remaining/1000)+' s':skill.cost+' energia';
    $('#skill'+slot).disabled=!c||remaining>0||energy<skill.cost||!!(skill.shadow&&c.active_form!=='madregona');
    if(document.activeElement?.id!=='equip'+slot&&!$('#equip'+slot).dataset.dirty)$('#equip'+slot).value=id;
    $('#applyEquip'+slot).disabled=!c||c.z>4;
  }
  $('#formMadregona').disabled=!c?.madregona_unlocked;
  $('#formStatus').textContent=c?.madregona_unlocked?(c.active_form==='madregona'?'Forma Madregona ativa · '+(c.disguise_animal?'disfarce de '+c.disguise_animal:'sombra revelada'):'Forma Madregona conquistada. Sua herança original permanece.'):'Derrote a Madregona para conquistar sua forma e habilidades de sombra.';
  $('#formOrigin').disabled=!c||c.active_form!=='madregona';
  $('#applyDisguise').disabled=!c||c.active_form!=='madregona';
  const origin=c?.origin||'América do Sul';
  if($('#disguiseAnimal').dataset.origin!==origin){$('#disguiseAnimal').replaceChildren(new Option('Sombra revelada',''),...Object.values(FAUNA).flat().map(a=>new Option(a,a)));$('#disguiseAnimal').dataset.origin=origin;}
  if(document.activeElement?.id!=='disguiseAnimal')$('#disguiseAnimal').value=c?.disguise_animal||'';
  const cooldown=madregona?.hp===0?Math.max(0,180000-(gameNow()-madregona.defeated_at)):0;
  $('#huntMadregona').disabled=!c||!!(madregona?.hp>0)||cooldown>0;
  $('#madregonaStatus').textContent=madregona?.hp>0?(madregona.revealed?'Madregona · '+madregona.hp+'/180 HP · pulsos de sombra a cada 3 s.':'Um vivente errante foi visto na fronteira (x: 6, z: 7). Observe sua sombra.') :cooldown>0?'Uma nova presença poderá surgir em '+Math.ceil(cooldown/1000)+' s.':'Rastreie uma presença disfarçada na fronteira. Prepare poções antes de partir.';
}

function characterCommand(intent){
  if(!player){notice('Escolha um personagem para começar.');return;}
  if(online){net.intent(intent);return;}
  P.prepare(player);const now=gameNow();
  try{
    if(intent.type==='attribute')P.allocate(player,intent.stat);
    if(intent.type==='rest'){
      if(player.z>4)throw Error('sanctuary_required');
      player.hp=P.maxHP(player);player.energy=P.maxEnergy(player);player.energy_updated=now;
    }
    if(intent.type==='equip'){
      if(player.z>4)throw Error('sanctuary_required');
      if(P.skills[intent.skill].shadow&&!player.madregona_unlocked)throw Error('locked_skill');
      if(player[intent.slot===1?'skill_b':'skill_a']===intent.skill)throw Error('duplicate_skill');
      player[intent.slot===1?'skill_a':'skill_b']=intent.skill;
    }
    if(intent.type==='form'){
      if(intent.form==='madregona'&&!player.madregona_unlocked)throw Error('locked_form');
      player.active_form=intent.form;player.disguise_animal='';player.veil_until=0;
    }
    if(intent.type==='disguise'){
      if(player.active_form!=='madregona'||(intent.animal!==''&&!Object.values(FAUNA).flat().includes(intent.animal)))throw Error('invalid_disguise');
      player.disguise_animal=intent.animal;
    }
    if(intent.type==='hunt'){
      if(madregona?.hp>0)return;
      if(madregona&&now-madregona.defeated_at<180000)throw Error('encounter_cooldown');
      madregona={x:6,z:7,hp:180,revealed:0,disguise_animal:FAUNA[player.origin][Math.floor(random()*3)],last_pulse:now,defeated_at:0};
      player.madregona=madregona;notice('Uma presença caminha entre os viventes. Procure a fronteira (x: 6, z: 7).');
    }
    persist();ui();
  }catch(error){notice(characterError(error.message));}
}

function characterError(code){return ({sanctuary_required:'Faça isso no santuário, fora da fronteira.',no_attribute_points:'Você não tem pontos de atributo disponíveis.',locked_form:'Derrote a Madregona para conquistar essa forma.',locked_skill:'Essa habilidade exige a vitória sobre a Madregona.',duplicate_skill:'Essa habilidade já está no outro espaço.',shadow_form_required:'Ative a forma Madregona para usar poderes de sombra.',insufficient_energy:'Energia insuficiente. Aguarde a recuperação ou descanse no santuário.',skill_cooldown:'A habilidade ainda está em recarga.',full_health:'Sua vitalidade já está completa.',out_of_range:'Aproxime-se do alvo na fronteira.',encounter_cooldown:'Aguarde três minutos entre encontros.',use_basic_attack_on_guardian:'Use o ataque básico contra o guardião.'})[code]||'Ação não aceita. Confira os requisitos.';}

function hitSoloMadregona(damage){
  if(!madregona||madregona.hp<=0||player.z<=4||distance(player,madregona)>3)throw Error('out_of_range');
  const firstReveal=!madregona.revealed;madregona.revealed=1;madregona.hp=Math.max(0,madregona.hp-damage);
  if(!madregona.hp){
    const first=!player.madregona_unlocked;player.madregona_unlocked=1;madregona.defeated_at=gameNow();gainXP(first?250:50);
    notice(first?'Madregona derrotada! Sua forma e poderes de sombra foram conquistados. +250 XP.':'Madregona derrotada. +50 XP.');
  }else if(firstReveal)notice('O disfarce se rompe. A Madregona revelou sua sombra!');
  player.madregona=madregona;
}

function useSkill(slot){
  if(!player)return;P.prepare(player);
  let targetId='';
  if(madregona?.hp>0&&distance(player,madregona)<=3)targetId='madregona';
  else if(raid&&distance(player,raid)<3)targetId='boss';
  else if(online)targetId=remotePlayers.find(p=>p.z>4&&player.z>4&&p.nation_id!==player.customNation&&distance(player,p)<=3)?.id||'';
  if(online){net.intent({type:'skill',slot,target:targetId});return;}
  try{
    const now=gameNow(),use=P.skillUse(player,slot,now);
    if(use.skill.kind==='heal'){
      if(player.hp>=P.maxHP(player))throw Error('full_health');
      player.hp=Math.min(P.maxHP(player),player.hp+25+player.spirit*3);
    }else if(use.skill.kind==='shield')player.veil_until=now+6000;
    else if(targetId==='madregona')hitSoloMadregona(use.damage);
    else if(targetId==='boss'){raid.hp-=use.damage;if(raid.hp<=0){raid=null;player.cards++;player.bag.coin+=10;gainXP(150);notice('Guardião derrotado! Asa Prismática, 10 moedas e 150 XP.');}}
    else{
      const enemy=enemies.find(e=>e.hp>0&&e.ready<=clock&&player.z>4&&distance(player,e)<=3);
      if(!enemy)throw Error('out_of_range');
      enemy.hp-=use.damage;if(enemy.hp<=0){enemy.ready=clock+20;player.bag.coin+=2;gainXP(20);}
    }
    player.energy=use.remaining;player.energy_updated=now;player['skill_'+use.id+'_at']=now;
    persist();ui();
  }catch(error){notice(characterError(error.message));}
}

function soloShadowPulse(){
  if(!madregona?.revealed||madregona.hp<=0||player.z<=4||distance(player,madregona)>4||gameNow()-madregona.last_pulse<3000)return;
  madregona.last_pulse=gameNow();player.hp-=player.veil_until>gameNow()?6:12;player.madregona=madregona;persist();
}

$('#develop').onclick=()=>{$('#characterSheet').showModal();characterUI();};
$('#closeCharacterSheet').onclick=()=>$('#characterSheet').close();
for(const [stat,label] of [['vitality','Vitality'],['power','Power'],['spirit','Spirit']])$('#add'+label).onclick=()=>characterCommand({type:'attribute',stat});
for(const slot of [1,2]){
  $('#equip'+slot).replaceChildren(...Object.entries(P.skills).map(([id,skill])=>new Option(skill.name+(skill.shadow?' · Madregona':''),id)));
  $('#equip'+slot).onchange=()=>{$('#equip'+slot).dataset.dirty='1';};$('#applyEquip'+slot).onclick=()=>{const skill=$('#equip'+slot).value;$('#equip'+slot).dataset.dirty='';characterCommand({type:'equip',slot,skill});};
  $('#skill'+slot).onclick=()=>useSkill(slot);
}
$('#rest').onclick=()=>characterCommand({type:'rest'});
$('#sheetPotion').onclick=()=>$('#potion').onclick();
$('#formOrigin').onclick=()=>characterCommand({type:'form',form:'origin'});
$('#formMadregona').onclick=()=>characterCommand({type:'form',form:'madregona'});
$('#applyDisguise').onclick=()=>characterCommand({type:'disguise',animal:$('#disguiseAnimal').value});
$('#huntMadregona').onclick=()=>characterCommand({type:'hunt'});

ui();
