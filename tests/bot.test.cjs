/* Bot engine regression tests run in Node without Playwright, browser or remote API. */
const fs=require('node:fs'),vm=require('node:vm');
const sources=['src/engine.js','src/dictionary.js','src/bot.js'].map(name=>fs.readFileSync(name,'utf8')).join('\n');
const tests=`
function check(ok,message){if(!ok)throw new Error(message);}
const dict=w=>validWord(w,'starter-demo-1');
const bag=fullBag('classic');
function pick(letter,n=0){return bag.filter(t=>t.letter===letter)[n];}
function game(rack){
 const g=createGame(()=>0.5,'starter-demo-1','classic');
 g.racks[g.turn]=rack;
 return g;
}
const common={words:['AT'],seed:3,maxTimeMs:2500,maxEvaluations:2000};
const first=game([pick('A'),pick('T'),pick('E'),pick('I'),pick('N'),pick('R'),pick('S')]);
const before=JSON.stringify(first);
const m=findBotMove(first,dict,common);
check(m.kind==='play'&&Array.isArray(m.placements)&&!('draft' in m),'Bot must return engine-compatible placements');
check(m.placements.some(p=>p.row===7&&p.col===7),'Opening word must cross center');
const result=play(first,m,dict,()=>0.5);
check(result.score===4,'Opening AT on center double word should score 4');
check(JSON.stringify(first)===before,'Candidate search must not mutate official state');
check(JSON.stringify(m)===JSON.stringify(findBotMove(first,dict,common)),'Same seed yields same answer');

// Existing board anchors legal vertical moves and accepts normal crosswords.
const mid=game([pick('E'),pick('N'),pick('O'),pick('S'),pick('I'),pick('R'),pick('T',1)]);
for(const [col,letter,tile] of [[7,'A',pick('A')],[8,'T',pick('T')]]){
 mid.board[7][col]={as:letter,tile,points:tile.points,owner:1};
}
const vertical=findBotMove(mid,dict,{words:['TEN'],seed:9,maxTimeMs:2500});
check(vertical.kind==='play','Should find vertical TEN attached to T in existing AT');
const vResult=play(mid,vertical,dict,()=>0.5);
check(vResult.words.some(w=>w.word==='TEN'),'Existing letters must be bridged correctly');
check(vertical.placements.every(p=>p.col===8),'Vertical anchor must use same column');

// Explicitly reject every word: safe pass, never a simulated score.
check(findBotMove(first,()=>false,{...common}).kind==='pass','No dictionary acceptance must pass');

// Blank must adopt required A-Z letter and remain zero points.
const blank=game([pick('?'),pick('T'),pick('E'),pick('I'),pick('R'),pick('S'),pick('N')]);
const bm=findBotMove(blank,dict,common);
check(bm.kind==='play','Blank should enable AT');
check(bm.placements.some(p=>p.tileId===pick('?').id&&p.as==='A'),'Blank must designate A');
check(play(blank,bm,dict,()=>0.5).score===2,'Blank scores zero, center DW applied');

// Block Flip candidate must correctly mark alternate letter.
const blocks=createGame(()=>0.5,'starter-demo-1','blocks'),blockBag=fullBag('blocks');
const eBlock=blockBag.find(t=>t.letter==='E'), tBlock=blockBag.find(t=>t.letter==='T');
blocks.racks[blocks.turn]=[eBlock,tBlock];
const flipMove=findBotMove(blocks,dict,common);
check(flipMove.kind==='play','Block Flip alternate E->A enables AT');
check(flipMove.placements.some(p=>p.tileId===eBlock.id&&p.flipped===true),'Alternate must be flagged as flipped');
play(blocks,flipMove,dict,()=>0.5);
check(findBotMove(first,dict,{words:['AT'],maxEvaluations:1,maxTimeMs:1}).kind==='pass'||
      ['play','pass'].includes(findBotMove(first,dict,{words:['AT'],maxEvaluations:1,maxTimeMs:1}).kind),
      'Tight budgets must return a legal response');
console.log('PASS offline bot: real legality, vertical anchors, blanks, Block Flip, determinism, no mutation');
`;
vm.runInNewContext(sources+'\n'+tests,{console,performance:require('node:perf_hooks').performance,Date,Math});
