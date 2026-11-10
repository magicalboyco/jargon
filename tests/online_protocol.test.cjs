/* Standalone Node smoke tests for the online access, secrecy and version protocol.
   Cloudflare storage is mocked; scoring correctness is separately covered by engine tests. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');

let workerSource=fs.readFileSync(path.join(__dirname,'../online/worker-source.js'),'utf8');
workerSource=workerSource.replace('export class JargonMatch','class JargonMatch');
workerSource=workerSource.replace('export default {','const cloudflareWorker = {');
workerSource+='\nglobalThis.JargonMatch=JargonMatch;globalThis.cloudflareWorker=cloudflareWorker;\n';
const environment={
  DurableObject:class{ constructor(ctx,env){this.ctx=ctx;this.env=env;} },
  createGame:(_rand,_dictVersion,mode)=>({
    mode,turn:0,board:Array.from({length:15},()=>Array(15).fill(null)),
    racks:[[{id:1,letter:'A',points:1}],[{id:2,letter:'PRIVATE-Z',points:10}]],
    bag:[],scores:[0,0],history:[],dictionaryVersion:'test-dictionary',finished:false
  }),
  DICTIONARY_VERSION:'test-dictionary',
  viewFor:(state,role)=>({
    board:state.board,rack:state.racks[role],
    opponentTileCount:state.racks[1-role].length,
    turn:state.turn,scores:state.scores,history:state.history
  }),
  validWord:()=>true,
  play:(state,move)=>{
    if(move.kind==='play'&&move.placements.some(p=>!state.racks[state.turn].some(t=>t.id===p.tileId)))throw Error('Tile not in rack');
    const next=JSON.parse(JSON.stringify(state));
    next.scores[next.turn]+=move.kind==='play'?7:0;
    next.history.push({kind:move.kind,player:next.turn});
    next.turn=1-next.turn;
    return {state:next,score:move.kind==='play'?7:0,words:move.kind==='play'?[{word:'A'}]:[]};
  },
  Request,Response,Headers,URL,TextEncoder,Uint8Array,Uint32Array,Date,Math,JSON,
  crypto:webcrypto,btoa,console
};
vm.runInNewContext(workerSource,environment,{filename:'online/worker-source.js'});
function createCtx(){
  let data=null;
  return {storage:{
    sql:{exec(sql,value){
      if(sql.startsWith('SELECT'))return {toArray:()=>data?[{data}]:[]};
      if(sql.startsWith('INSERT')){data=value;return {toArray:()=>[]};}
      if(sql.startsWith('DELETE')){data=null;return {toArray:()=>[]};}
      return {toArray:()=>[]};
    }},
    async setAlarm(){},async deleteAlarm(){}
  }};
}
const stubs=new Map();
const env={
  MATCH_CREATION_ENABLED:'true',
  ALLOWED_ORIGINS:'https://jargon-playtest-e50iok.v2.appdeploy.ai',
  MATCHES:{getByName(name){if(!stubs.has(name))stubs.set(name,new environment.JargonMatch(createCtx(),env));return stubs.get(name);}}
};
const api=environment.cloudflareWorker;
async function send(method,route,token,data){
  const headers={'Origin':'https://jargon-playtest-e50iok.v2.appdeploy.ai'};
  if(token)headers.Authorization='Bearer '+token;
  if(data!==undefined)headers['Content-Type']='application/json';
  const response=await api.fetch(new Request('https://jargon-api.example'+route,{
    method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})
  }),env);
  return {status:response.status,data:await response.json()};
}
(async()=>{
  const create=await send('POST','/v1/matches',null,{mode:'classic',name:'Alice'});
  assert.equal(create.status,201);
  assert.equal(create.data.hostKey.length,32);
  assert.equal(create.data.guestKey.length,32);
  assert.equal(create.data.matchId.length,24);
  const id=create.data.matchId,host=create.data.hostKey,guest=create.data.guestKey;
  let result=await send('GET','/v1/matches/'+id,'A'.repeat(32));
  assert.equal(result.status,403,'invalid player key rejected');
  result=await send('POST','/v1/matches/'+id+'/join',guest,{name:'Bob'});
  assert.equal(result.status,200);
  assert.equal(result.data.data.player,1);
  const guestView=JSON.stringify(result.data.data.game);
  assert(!guestView.includes('"letter":"A"'),'guest must not receive host rack');
  assert(guestView.includes('PRIVATE-Z'),'guest sees own rack');
  result=await send('GET','/v1/matches/'+id,host);
  assert.equal(result.status,200);
  assert.equal(result.data.data.player,0);
  assert(!JSON.stringify(result.data.data.game).includes('PRIVATE-Z'),'host must not receive guest rack');
  const requestId='first-move-request';
  result=await send('POST','/v1/matches/'+id+'/moves',host,{version:0,requestId,move:{kind:'play',placements:[{row:7,col:7,tileId:1}]}});
  assert.equal(result.status,200);
  assert.equal(result.data.data.version,1);
  const duplicate=await send('POST','/v1/matches/'+id+'/moves',host,{version:0,requestId,move:{kind:'play',placements:[{row:7,col:7,tileId:1}]}});
  assert.equal(duplicate.status,200);
  assert.equal(duplicate.data.duplicate,true);
  assert.equal(duplicate.data.data.version,1);
  result=await send('POST','/v1/matches/'+id+'/moves',host,{version:1,requestId:'other-request-id',move:{kind:'pass'}});
  assert.equal(result.status,409,'host cannot play out of turn');
  result=await send('POST','/v1/matches/'+id+'/moves',guest,{version:0,requestId:'guest-move-id',move:{kind:'pass'}});
  assert.equal(result.status,409,'stale version cannot overwrite game');
  result=await send('POST','/v1/matches/'+id+'/moves',guest,{version:1,requestId:'guest-move-id',move:{kind:'pass'}});
  assert.equal(result.status,200);
  assert.equal(result.data.data.version,2);
  result=await send('DELETE','/v1/matches/'+id,guest);
  assert.equal(result.status,403,'guest cannot delete match created by host');
  result=await send('DELETE','/v1/matches/'+id,host);
  assert.equal(result.status,200);
  result=await send('GET','/v1/matches/'+id,host);
  assert.equal(result.status,410,'deleted match is inaccessible');
  console.log('PASS private online protocol: token access, rack secrecy, authoritative turns, stale writes, idempotency, deletion');
})().catch(error=>{console.error(error);process.exitCode=1;});
