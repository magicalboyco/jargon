/* Private online Jargon client transport. No accounts, analytics, cookies, or third-party SDKs.
   This module is not loaded by the local playable alpha until online mode passes QA. */
const MATCH_ID=/^[A-Za-z0-9_-]{22,28}$/;
const KEY=/^[A-Za-z0-9_-]{32,86}$/;

export function parseFriendInvite(fragment) {
  const value=String(fragment||'').replace(/^#/,'');
  const token=value.startsWith('join=')?value.slice(5):'';
  const split=token.indexOf('.');
  if(split<0)return null;
  const matchId=token.slice(0,split),key=token.slice(split+1);
  return MATCH_ID.test(matchId)&&KEY.test(key)?{matchId,key}:null;
}
export function friendInviteLink(matchId,guestKey,baseHref) {
  if(!MATCH_ID.test(matchId)||!KEY.test(guestKey))throw new Error('Invalid invitation');
  const base=new URL(baseHref);
  const url=new URL('friends.html',base);
  url.hash='join='+matchId+'.'+guestKey;
  return url.href;
}
export class JargonMatchClient {
  constructor({endpoint,storage=globalThis.localStorage,fetcher=globalThis.fetch}={}) {
    if(!endpoint)throw new Error('A secure Jargon match service URL is required');
    const url=new URL(endpoint);
    if(url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))
      throw new Error('Jargon online matches require HTTPS');
    this.endpoint=url.origin;
    this.storage=storage;
    this.fetcher=fetcher;
  }
  storageKey(matchId) { return 'jargon.private.match.v1:'+matchId; }
  saveKey(matchId,key) {
    if(!MATCH_ID.test(matchId)||!KEY.test(key))throw new Error('Invalid private match key');
    this.storage.setItem(this.storageKey(matchId),key);
  }
  getKey(matchId) { return this.storage.getItem(this.storageKey(matchId)); }
  async request(path,{method='GET',key,body}={}) {
    const headers={'Accept':'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(key)headers.Authorization='Bearer '+key;
    const response=await this.fetcher(this.endpoint+path,{
      method,headers,credentials:'omit',redirect:'error',cache:'no-store',
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    const result=await response.json();
    if(!response.ok||!result.ok) {
      const error=new Error(result.error||'The match service could not complete this request');
      error.status=response.status;
      throw error;
    }
    return result;
  }
  async create({name='Word Friend',mode='classic'}={}) {
    const result=await this.request('/v1/matches',{
      method:'POST',body:{name:String(name).slice(0,24),mode:mode==='blocks'?'blocks':'classic'}
    });
    this.saveKey(result.matchId,result.hostKey);
    return {matchId:result.matchId,guestKey:result.guestKey,game:result.game};
  }
  async join({matchId,key,name='Word Friend'}) {
    if(!MATCH_ID.test(matchId)||!KEY.test(key))throw new Error('Invalid invitation');
    const result=await this.request('/v1/matches/'+matchId+'/join',{
      method:'POST',key,body:{name:String(name).slice(0,24)}
    });
    this.saveKey(matchId,key);
    return result.data;
  }
  async read(matchId) {
    const key=this.getKey(matchId);
    if(!key)throw new Error('This device has no access key for that match');
    return (await this.request('/v1/matches/'+matchId,{key})).data;
  }
  async submit(matchId,{version,move,requestId}) {
    if(!Number.isSafeInteger(version)||version<0)throw new Error('Invalid match version');
    if(!/^[A-Za-z0-9_-]{8,80}$/.test(requestId))throw new Error('Invalid request ID');
    const key=this.getKey(matchId);
    if(!key)throw new Error('This device has no access key for that match');
    const result=await this.request('/v1/matches/'+matchId+'/moves',{
      method:'POST',key,body:{version,move,requestId}
    });
    return result.data;
  }
  async deleteMatch(matchId) {
    const key=this.getKey(matchId);
    if(!key)throw new Error('This device has no access key for that match');
    const result=await this.request('/v1/matches/'+matchId,{method:'DELETE',key});
    this.storage.removeItem(this.storageKey(matchId));
    return result.data;
  }
}
