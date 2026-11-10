/* Jargon private friend matches — Cloudflare Worker + one Durable Object per match.
   The build script prepends the SAME game engine and pinned dictionary as offline Jargon.
   DO NOT deploy with MATCH_CREATION_ENABLED=true until abuse/rate-limit gates are tested. */
const MATCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BODY_LIMIT = 8192;
const MATCH_ID_PATTERN = /^[a-zA-Z0-9_-]{22,28}$/;
function apiError(status, message) { return {ok:false,status,error:message}; }
function cleanName(input) {
  const name = String(input || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0,24);
  return name || 'Word Friend';
}
function secureRandom() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const item of bytes) binary += String.fromCharCode(item);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function randomFraction() {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0] / 4294967296;
}
async function digestToken(token) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
}
function snapshot(room, role) {
  return {
    matchId:room.id, version:room.version, player:role,
    phase:room.guestJoined?'playing':'waiting-for-friend',
    names:[room.hostName,room.guestName || 'Your friend'],
    expiresAt:room.expiresAt,
    lastMove:room.lastMove,
    game:viewFor(room.game,role)
  };
}
function validatedMove(move) {
  if (!move || typeof move!=='object' || !['play','pass','swap','resign'].includes(move.kind)) return false;
  if (move.kind==='play') {
    if (!Array.isArray(move.placements) || move.placements.length<1 || move.placements.length>7) return false;
    return move.placements.every(p=>p&&Number.isInteger(p.row)&&Number.isInteger(p.col)&&
      p.row>=0&&p.row<15&&p.col>=0&&p.col<15&&Number.isInteger(p.tileId)&&
      (p.as===undefined || /^[A-Z]$/.test(p.as)) &&
      (p.flipped===undefined || typeof p.flipped==='boolean'));
  }
  if (move.kind==='swap') {
    return Array.isArray(move.tileIds) && move.tileIds.length>0 && move.tileIds.length<=7 &&
      move.tileIds.every(Number.isInteger);
  }
  return true;
}
export class JargonMatch extends DurableObject {
  constructor(ctx, env) {
    super(ctx,env);
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS current (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
  }
  read() {
    const rows=this.ctx.storage.sql.exec('SELECT data FROM current WHERE id=1').toArray();
    return rows.length?JSON.parse(rows[0].data):null;
  }
  write(room) {
    this.ctx.storage.sql.exec('INSERT INTO current(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(room));
  }
  remove() { this.ctx.storage.sql.exec('DELETE FROM current WHERE id=1'); }
  active() {
    const room=this.read();
    if (!room) return null;
    if (Date.now()>=room.expiresAt) { this.remove(); return null; }
    return room;
  }
  player(room,digest) {
    if(digest===room.hostDigest)return 0;
    if(digest===room.guestDigest)return 1;
    return -1;
  }
  async create({id,mode,hostDigest,guestDigest,hostName}) {
    if(this.read())return apiError(409,'Match already exists');
    if(!MATCH_ID_PATTERN.test(id)||!['classic','blocks'].includes(mode))return apiError(400,'Invalid match settings');
    const game=createGame(randomFraction,DICTIONARY_VERSION,mode);
    const room={id,version:0,hostDigest,guestDigest,hostName:cleanName(hostName),
      guestName:null,guestJoined:false,game,lastMove:null,expiresAt:Date.now()+MATCH_TTL_MS,
      recentRequests:[null,null]};
    this.write(room);
    await this.ctx.storage.setAlarm(room.expiresAt);
    return {ok:true,data:{matchId:id,version:0,expiresAt:room.expiresAt}};
  }
  async join({digest,name}) {
    const room=this.active();
    if(!room)return apiError(410,'Match expired or deleted');
    if(digest!==room.guestDigest)return apiError(403,'Invalid invitation');
    if(!room.guestJoined) {
      room.guestName=cleanName(name);
      room.guestJoined=true;
      this.write(room);
    }
    return {ok:true,data:snapshot(room,1)};
  }
  async state({digest}) {
    const room=this.active();
    if(!room)return apiError(410,'Match expired or deleted');
    const role=this.player(room,digest);
    if(role<0)return apiError(403,'Invalid player key');
    return {ok:true,data:snapshot(room,role)};
  }
  async move({digest,expectedVersion,requestId,move}) {
    const room=this.active();
    if(!room)return apiError(410,'Match expired or deleted');
    const role=this.player(room,digest);
    if(role<0)return apiError(403,'Invalid player key');
    if(!room.guestJoined)return apiError(409,'Waiting for your friend to join');
    if(!/^[A-Za-z0-9_-]{8,80}$/.test(String(requestId||'')))return apiError(400,'Missing request ID');
    if(room.recentRequests[role]===requestId)return {ok:true,duplicate:true,data:snapshot(room,role)};
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion!==room.version)return apiError(409,'Match changed; refresh before playing');
    if(room.game.turn!==role)return apiError(409,'It is not your turn');
    if(!validatedMove(move))return apiError(400,'Invalid move format');
    let result;
    try { result=play(room.game,move,word=>validWord(word,room.game.dictionaryVersion),randomFraction); }
    catch(error) { return apiError(422,String(error.message||'Illegal move').slice(0,160)); }
    room.game=result.state;
    room.version++;
    room.recentRequests[role]=requestId;
    room.lastMove={player:role,kind:move.kind,score:result.score,words:result.words||[]};
    room.expiresAt=Date.now()+MATCH_TTL_MS;
    this.write(room);
    await this.ctx.storage.setAlarm(room.expiresAt);
    return {ok:true,data:snapshot(room,role)};
  }
  async deleteMatch({digest}) {
    const room=this.active();
    if(!room)return apiError(410,'Match expired or deleted');
    if(digest!==room.hostDigest)return apiError(403,'Only the match creator can delete this match');
    this.remove();
    await this.ctx.storage.deleteAlarm();
    return {ok:true,data:{deleted:true}};
  }
  async alarm() {
    const room=this.read();
    if(room && Date.now()>=room.expiresAt)this.remove();
    else if(room)await this.ctx.storage.setAlarm(room.expiresAt);
  }
}
function respond(payload, origin, status=200) {
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin';}
  return new Response(JSON.stringify(payload),{status,headers});
}
async function bodyJson(request) {
  const length=Number(request.headers.get('Content-Length')||0);
  if(length>BODY_LIMIT)throw new Error('Request too large');
  const text=await request.text();
  if(text.length>BODY_LIMIT)throw new Error('Request too large');
  return JSON.parse(text||'{}');
}
function bearer(request) {
  const match=/^Bearer ([A-Za-z0-9_-]{32,86})$/.exec(request.headers.get('Authorization')||'');
  return match?match[1]:null;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGINS||'https://jargon-playtest-e50iok.v2.appdeploy.ai')
      .split(',').map(x=>x.trim());
    if(origin&&!allowed.includes(origin))return respond(apiError(403,'Origin not allowed'),null,403);
    if(request.method==='OPTIONS') {
      const headers={'Access-Control-Allow-Origin':origin||allowed[0],
        'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':'Authorization,Content-Type',
        'Access-Control-Max-Age':'300','Cache-Control':'no-store'};
      return new Response(null,{status:204,headers});
    }
    if(url.pathname==='/v1/health'&&request.method==='GET')return respond({ok:true,service:'jargon-private-matches',version:1},origin);
    if(!url.pathname.startsWith('/v1/matches'))return respond(apiError(404,'Not found'),origin,404);
    try {
      if(url.pathname==='/v1/matches'&&request.method==='POST') {
        if(env.MATCH_CREATION_ENABLED!=='true')return respond(apiError(503,'Invitations are not enabled yet'),origin,503);
        const input=await bodyJson(request);
        const mode=input.mode==='blocks'?'blocks':'classic';
        const id=secureRandom(),hostKey=secureRandom(),guestKey=secureRandom();
        const stub=env.MATCHES.getByName('jargon:'+id);
        const result=await stub.create({id,mode,hostDigest:await digestToken(hostKey),
          guestDigest:await digestToken(guestKey),hostName:input.name});
        if(!result.ok)return respond(result,origin,result.status);
        return respond({ok:true,matchId:id,hostKey,guestKey,game:result.data},origin,201);
      }
      const match=/^\/v1\/matches\/([a-zA-Z0-9_-]{22,28})(?:\/(join|moves))?$/.exec(url.pathname);
      if(!match)return respond(apiError(404,'Not found'),origin,404);
      const token=bearer(request);
      if(!token)return respond(apiError(401,'A private player key is required'),origin,401);
      const [id,action]=[match[1],match[2]||''];
      const digest=await digestToken(token);
      const stub=env.MATCHES.getByName('jargon:'+id);
      let result;
      if(request.method==='GET'&&!action)result=await stub.state({digest});
      else if(request.method==='POST'&&action==='join'){
        const input=await bodyJson(request);
        result=await stub.join({digest,name:input.name});
      }else if(request.method==='POST'&&action==='moves'){
        const input=await bodyJson(request);
        result=await stub.move({digest,expectedVersion:input.version,requestId:input.requestId,move:input.move});
      }else if(request.method==='DELETE'&&!action)result=await stub.deleteMatch({digest});
      else return respond(apiError(405,'Method not allowed'),origin,405);
      return respond(result,origin,result.ok?200:result.status||400);
    }catch(error){
      if(error instanceof SyntaxError)return respond(apiError(400,'Invalid JSON'),origin,400);
      if(error.message==='Request too large')return respond(apiError(413,'Request too large'),origin,413);
      return respond(apiError(500,'Match service temporarily unavailable'),origin,500);
    }
  }
};
