const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function client(){
  const elements=new Map(),timers=new Map(),events={};let nextTimer=0;
  const element=s=>{if(!elements.has(s))elements.set(s,{textContent:'',value:'',style:{},dataset:{},open:false,classList:{add(){},remove(){},toggle(){}},setAttribute(name,value){this[name]=value;},replaceChildren(){},append(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},getBoundingClientRect(){return{width:800,height:700,left:0,top:0};},getContext(){return{setTransform(){}};}});return elements.get(s);};
  class Socket {static OPEN=1;readyState=1;close(){};send(){};}
  const context=vm.createContext({console,URL,WebSocket:Socket,fetch:async()=>({ok:false}),setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},performance:{now:()=>1000},localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:element,querySelectorAll:()=>[],createElement:()=>({append(){}}),addEventListener(){}},Option:function(text,value){this.value=value;},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},addEventListener(type,fn){events[type]=fn;},location:{href:'https://game.example/',protocol:'https:'},prompt:()=>null});
  for(const file of ['dist/game.js','dist/network.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  return{run:code=>vm.runInContext(code,context),timers,events,element};
}

test('online status and server nation survive periodic UI updates',()=>{
  const {run}=client();
  run(`online=true;net.snapshot({type:'snapshot',self:'c',players:[{id:'c',name:'Test',continent:Object.keys(FAUNA)[0],animal:FAUNA[Object.keys(FAUNA)[0]][0],nation_id:'server-nation',morph_until:0,x:0,z:0}],inventory:{fruit:2,plant:0,liquid:1,coin:0,potion:0,cloth:0,cards:0,hp:75},server_time:1000});ui();`);
  assert.equal(run("$('#slots').textContent"),'ONLINE');
  assert.equal(run("$('#nation').textContent"),'server-nation');
  assert.match(run("$('#nationText').textContent"),/servidor/);
  assert.equal(run('player.bag.fruit'),2);
});

test('typing and movement pause while login dialog is open',()=>{
  const {run,events}=client();
  run("$('#creator').close();$('#login').showModal();");
  events.keydown({target:{matches:()=>false},key:'w',preventDefault(){}});
  assert.equal(run('keys.size'),0);
  assert.equal(run('dialogOpen()'),true);
  run("$('#login').close()");
  events.keydown({target:{matches:()=>false},key:'w',preventDefault(){}});
  assert.equal(run('keys.has("w")'),true);
});

test('ticket failures retry until the connection recovers',async()=>{
  const {run,timers}=client();
  await assert.rejects(run("net.api=async()=>{throw Error('offline')};net.join({id:'c'})"),/offline/);
  assert.equal(timers.size,1);
  const retry=timers.values().next().value;timers.clear();await retry();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timers.size,1);
  assert.equal(run('net.retry'),2);
  run("net.api=async()=>({ticket:'ok'})");
  const recover=timers.values().next().value;timers.clear();await recover();
  await new Promise(resolve=>setImmediate(resolve));
  run('net.socket.onopen()');
  assert.equal(timers.size,0);
  assert.equal(run('net.retry'),0);
});

test('switching characters invalidates a pending reconnect',async()=>{
  const {run,timers}=client();
  await assert.rejects(run("net.api=async()=>{throw Error('offline')};net.join({id:'old'})"));
  const stale=timers.values().next().value;
  await run("net.api=async()=>({ticket:'ok'});net.join({id:'new'})");
  stale();
  assert.equal(run('net.character.id'),'new');
  assert.equal(timers.size,0);
});

test('online actions are safe before the first character snapshot',()=>{
  const {run}=client();
  assert.doesNotThrow(()=>run('online=true;player=null;net.collect();net.attack();attack()'));
});

test('online journey does not duplicate snapshots or leak progress between characters',()=>{
  const {run}=client();
  run(`online=true;const snap=(id,fruit,potion=0)=>net.snapshot({type:'snapshot',self:id,players:[{id,name:'Test',continent:Object.keys(FAUNA)[0],animal:FAUNA[Object.keys(FAUNA)[0]][0],nation_id:'nation',morph_until:0,x:0,z:0}],inventory:{fruit,plant:0,liquid:0,coin:0,potion,cloth:0,cards:0,hp:100},server_time:1000});snap('a',5,1);snap('a',5,1);`);
  assert.equal(run('player.collected'),5);
  assert.equal(run("$('#journeyCount').textContent"),'2/3');
  run("snap('b',0)");
  assert.equal(run('player.collected'),0);
  assert.equal(run('player.crafted'),0);
  run("snap('a',5,0)");
  assert.equal(run('player.crafted'),1);
});
