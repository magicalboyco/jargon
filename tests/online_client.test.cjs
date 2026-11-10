const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const {JargonMatchClient,parseFriendInvite,friendInviteLink}=
    await import(pathToFileURL(path.join(__dirname,'../online/client.mjs')).href);
  const matchId='m'.repeat(24),hostKey='h'.repeat(32),guestKey='g'.repeat(32);
  const invite=friendInviteLink(matchId,guestKey,'https://jargon-playtest-e50iok.v2.appdeploy.ai/index.html');
  const u=new URL(invite);
  assert.equal(u.origin,'https://jargon-playtest-e50iok.v2.appdeploy.ai');
  assert.equal(u.pathname,'/friends.html');
  assert.equal(u.search,'','keys must never be in query parameters');
  assert.equal(parseFriendInvite(u.hash).key,guestKey);
  assert.equal(parseFriendInvite('#join=bad.token'),null);
  const memory=new Map();
  const storage={
    getItem:k=>memory.get(k)||null,
    setItem:(k,v)=>{memory.set(k,v);},
    removeItem:k=>memory.delete(k)
  };
  const requests=[];
  const fetcher=async (url,options)=>{
    requests.push({url,options});
    assert(!url.includes(hostKey)&&!url.includes(guestKey),'keys must not leak in the request URL');
    assert.equal(options.credentials,'omit');
    assert.equal(options.redirect,'error');
    if(url.endsWith('/v1/matches')&&options.method==='POST')
      return {ok:true,status:201,json:async()=>({ok:true,matchId,hostKey,guestKey,game:{version:0}})};
    if(url.endsWith('/join'))return {ok:true,status:200,json:async()=>({ok:true,data:{player:1,version:0}})};
    if(url.endsWith('/moves'))return {ok:true,status:200,json:async()=>({ok:true,data:{version:1,player:0}})};
    if(options.method==='DELETE')return {ok:true,status:200,json:async()=>({ok:true,data:{deleted:true}})};
    return {ok:true,status:200,json:async()=>({ok:true,data:{version:0,player:0}})};
  };
  assert.throws(()=>new JargonMatchClient({endpoint:'http://word-game.example',storage,fetcher}),/HTTPS/);
  const client=new JargonMatchClient({endpoint:'https://jargon-api.example',storage,fetcher});
  const created=await client.create({name:'Alice',mode:'classic'});
  assert.equal(created.matchId,matchId);
  assert.equal(client.getKey(matchId),hostKey);
  await client.read(matchId);
  assert.equal(requests.at(-1).options.headers.Authorization,'Bearer '+hostKey);
  const next=await client.submit(matchId,{version:0,requestId:'a-request-123',move:{kind:'pass'}});
  assert.equal(next.version,1);
  assert.equal(requests.at(-1).options.body.includes('a-request-123'),true);
  await client.join({matchId,key:guestKey,name:'Bob'});
  assert.equal(client.getKey(matchId),guestKey);
  assert.equal(requests.at(-1).options.headers.Authorization,'Bearer '+guestKey);
  await client.deleteMatch(matchId);
  assert.equal(client.getKey(matchId),null);
  console.log('PASS private invite fragments, key storage, authorized requests, versioned move, deletion and HTTPS policy');
})().catch(error=>{console.error(error);process.exitCode=1;});
