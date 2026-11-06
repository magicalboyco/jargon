/* Pure engine/bot integration tests, no npm dependencies. Run: node tests/bot_test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const file of ['src/dictionary.js','src/engine.js','src/bot.js']){
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}
function deterministicRack(letters,mode='classic'){
  const bag=fullBag(mode),used=new Set();
  return letters.map(letter=>{
    const tile=bag.find(t=>!used.has(t.id)&&(letter==='?'?t.blank:t.letter===letter));
    assert.ok(tile,'Missing tile '+letter);
    used.add(tile.id);return tile;
  });
}
function game(rack,mode='classic'){
  const state=createGame(()=>0.5,'starter-demo-1',mode);
  state.racks[0]=deterministicRack(rack,mode);
  return state;
}
function runMove(state,move){
  return play(state,move,w=>validWord(w,'starter-demo-1'),()=>0.5);
}
{
  const state=game(['A','T','E','I','R','N','O']);
  const before=JSON.stringify(state);
  const options={seed:42,words:['AT'],maxTimeMs:5000};
  const first=findBotMove(state,w=>validWord(w,'starter-demo-1'),options);
  const second=findBotMove(state,w=>validWord(w,'starter-demo-1'),options);
  assert.deepEqual(first,second,'same seed must produce identical move');
  assert.equal(first.kind,'play');
  assert.ok(first.placements.some(p=>p.row===7&&p.col===7),'opening move must cover center');
  assert.equal(runMove(state,first).score,4);
  assert.equal(JSON.stringify(state),before,'bot must not mutate state');
  console.log('PASS opening, deterministic selection, engine score and immutability');
}
{
  const state=game(['O','W','E','I','R','N','U']);
  const fixed=deterministicRack(['C','A','T']);
  ['C','A','T'].forEach((ch,i)=>{
    state.board[7][7+i]={as:ch,tile:fixed[i],points:fixed[i].points,owner:1};
  });
  const move=findBotMove(state,w=>validWord(w,'starter-demo-1'),{
    seed:5,words:['COW'],maxTimeMs:5000
  });
  assert.equal(move.kind,'play');
  assert.ok(move.placements.every(p=>p.col===7),'must build COW vertically');
  assert.equal(runMove(state,move).words[0].word,'COW');
  console.log('PASS vertical hook into horizontal word');
}
{
  const state=game(['?','T','E','I','R','N','O']);
  const move=findBotMove(state,w=>validWord(w,'starter-demo-1'),{
    seed:8,words:['AT'],maxTimeMs:5000
  });
  assert.equal(move.kind,'play');
  const blank=move.placements.find(p=>p.tileId===state.racks[0][0].id);
  assert.ok(blank&&/^[A-Z]$/.test(blank.as));
  runMove(state,move);
  console.log('PASS blank designation and official engine validation');
}
{
  const state=game(['A','T']);
  const move=findBotMove(state,()=>false,{seed:5,words:['AT'],maxTimeMs:5000});
  assert.deepEqual(move,{kind:'pass'});
  console.log('PASS pass when dictionary invalidates every candidate');
}
{
  const state=game(['A','T','E','I','R','N','O']);
  const move=findBotMove(state,w=>validWord(w,'starter-demo-1'),{
    seed:12,words:['AT','TA','TE','IT'],maxTimeMs:1,maxEvaluations:2
  });
  assert.ok(move.kind==='play'||move.kind==='pass');
  if(move.kind==='play')runMove(state,move);
  console.log('PASS bounded search returns an engine-compatible move');
}
{
  const state=game(['A','T','E','I','R','N','O'],'blocks');
  const move=findBotMove(state,w=>validWord(w,'starter-demo-1'),{
    seed:12,words:['AT'],maxTimeMs:5000
  });
  assert.equal(move.kind,'play');
  runMove(state,move);
  console.log('PASS Block Flip basic move compatibility');
}
