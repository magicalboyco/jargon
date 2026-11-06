/* Jargon offline computer player. No imports: tools/build.py embeds this after engine + dictionary. */
function jargonBotRandom(seed) {
  let value = Number(seed) >>> 0;
  return function () {
    value = (value + 0x6d2b79f5) | 0;
    let x = Math.imul(value ^ (value >>> 15), 1 | value);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
/**
 * Return an engine-compatible {kind:'play',placements:[...]}, or {kind:'pass'}.
 * Uses the existing pure play() and validWord(); never simulates scores.
 * An elapsed-time limit is best-effort, not a hard realtime guarantee.
 * Stable seed + deterministic evaluation cap gives repeatable results when time permits.
 */
function findBotMove(game, checkWord, options={}) {
  if (game.finished) return {kind:'pass'};
  if (typeof checkWord!=='function') throw new TypeError('Bot requires dictionary checker');
  const rng=jargonBotRandom(options.seed===undefined?1337:options.seed);
  const clock=typeof performance!=='undefined'?()=>performance.now():()=>Date.now();
  const began=clock();
  const maxTime=Math.max(1,options.maxTimeMs??160);
  const maxEvaluations=Math.max(1,options.maxEvaluations??2400);
  const maxWords=Math.max(1,options.maxWords??18000);
  const allWords=options.words||getWords(game.dictionaryVersion);
  const rack=game.racks[game.turn]||[];
  const occupied=[];
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    const cell=game.board[r][c];
    if(cell)occupied.push({row:r,col:c,letter:cell.as});
  }
  const opening=occupied.length===0;
  const anchors=opening?[{row:7,col:7,letter:null}]:occupied.slice(0,40);
  // On the opening turn, prioritize words actually formable from the rack.
  // For later turns, sample throughout the alphabet rather than one contiguous dictionary slice.
  function openingFeasible(word) {
    const used=new Set();
    function assign(index) {
      if(index===word.length)return true;
      const ch=word[index],candidates=[];
      for(let i=0;i<rack.length;i++){
        if(used.has(i))continue;
        const tile=rack[i];
        if(!tile.blank&&tile.letter===ch)candidates.push(i);
        else if(!tile.blank&&game.mode==='blocks'&&tile.alternate===ch)candidates.push(i);
        else if(tile.blank)candidates.push(i);
      }
      for(const i of candidates){
        used.add(i);
        if(assign(index+1))return true;
        used.delete(i);
      }
      return false;
    }
    return assign(0);
  }
  const wordList=Array.from(allWords).filter(w=>typeof w==='string'&&/^[A-Z]{2,9}$/.test(w));
  const words=opening?wordList.filter(w=>w.length<=rack.length&&openingFeasible(w)):wordList;
  const seen=new Set(),choices=[];
  let evaluations=0;
  const expired=()=>clock()-began>=maxTime||evaluations>=maxEvaluations;
  function evaluate(word,r,c,vertical){
    if(expired())return;
    const dr=vertical?1:0,dc=vertical?0:1;
    if(r<0||c<0||r+dr*(word.length-1)>=15||c+dc*(word.length-1)>=15)return;
    const used=new Set(),placements=[];
    for(let i=0;i<word.length;i++){
      const row=r+i*dr,col=c+i*dc,ch=word[i],cell=game.board[row][col];
      if(cell){if(cell.as!==ch)return;continue;}
      let match=null;
      for(const tile of rack){
        if(used.has(tile.id))continue;
        if(!tile.blank&&tile.letter===ch){match={tile,flipped:false};break;}
      }
      if(!match&&game.mode==='blocks'){
        for(const tile of rack){
          if(!used.has(tile.id)&&!tile.blank&&tile.alternate===ch){
            match={tile,flipped:true};break;
          }
        }
      }
      if(!match){
        for(const tile of rack)if(!used.has(tile.id)&&tile.blank){
          match={tile,flipped:false};break;
        }
      }
      if(!match)return;
      used.add(match.tile.id);
      placements.push({row,col,tileId:match.tile.id,flipped:match.flipped,
        ...(match.tile.blank?{as:ch}:{})});
      if(placements.length>7)return;
    }
    if(!placements.length)return;
    const signature=placements.map(p=>[p.row,p.col,p.tileId,p.flipped,p.as||''].join(':')).join('|');
    if(seen.has(signature))return;
    seen.add(signature);
    evaluations++;
    try {
      const result=play(game,{kind:'play',placements},checkWord,()=>0.5);
      if(result.score>0)choices.push({score:result.score,placements,words:result.words});
    } catch (_invalidMove) { /* The authoritative engine rejects illegal moves/crosswords. */ }
  }
  // Start at a seed-dependent position so alphabetical dictionary order does not bias every turn.
  const start=words.length?Math.floor(rng()*words.length):0;
  // A coprime stride prevents a short search budget from clustering within the same alphabetical prefix.
  let stride=words.length>1?Math.max(1,Math.floor(words.length*0.61803398875)):1;
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  while(words.length>1&&gcd(stride,words.length)!==1)stride++;
  for(let count=0;count<Math.min(words.length,maxWords);count++){
    if(expired())break;
    const word=words[(start+count*stride)%words.length];
    if(opening){
      if(word.length>rack.length)continue;
      for(let i=0;i<word.length;i++){
        evaluate(word,7,7-i,false);
        evaluate(word,7-i,7,true);
        if(expired())break;
      }
    }else{
      for(const anchor of anchors){
        for(let i=0;i<word.length;i++){
          if(word[i]!==anchor.letter)continue;
          evaluate(word,anchor.row,anchor.col-i,false);
          evaluate(word,anchor.row-i,anchor.col,true);
          if(expired())break;
        }
        if(expired())break;
      }
    }
  }
  if(!choices.length)return {kind:'pass'};
  // Highest scoring is an option; beginners choose from the middle range of legal candidates.
  choices.sort((a,b)=>b.score-a.score||a.placements.length-b.placements.length);
  const best=options.difficulty==='greedy'?choices[0]:choices[Math.floor(choices.length*(0.25+rng()*0.5))];
  return {kind:'play',placements:best.placements};
}
