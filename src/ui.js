window.addEventListener('error', function(event) {
  var notice=document.getElementById('runtime-alert');
  if(notice){ notice.textContent='Jargon could not start in this viewer. Please open it as a webpage in Safari or Chrome. Details: '+(event.message||'JavaScript error');notice.classList.add('visible'); }
});
// ===== Browser UI =====
const $=id=>document.getElementById(id);const STORE='jargon-local-alpha-v1',THEME='jargon-theme';
// Files opened in iOS document previews may have no usable localStorage.
// Storage failures must never prevent the board from rendering.
const safeStorage={
  get(key){try{return window.localStorage.getItem(key)}catch{return null}},
  set(key,value){try{window.localStorage.setItem(key,value);return true}catch{return false}},
  remove(key){try{window.localStorage.removeItem(key)}catch{}}
};
// v2 stores staged placements together with their rack. Legacy saves are migrated in place.
// Pending tiles remain in the rack until submission: there is no tile duplication.
let saved;
try { saved=JSON.parse(safeStorage.get(STORE)||'null'); } catch { saved=null; }
let state=saved?.game||saved;
if(!state||state.board?.length!==15||!Array.isArray(state.racks)||!Array.isArray(state.bag)) state=createGame();
if(!state.mode) state.mode='classic';
function validDraft(value,game){
 if(!Array.isArray(value)||value.length>7)return [];
 const ids=new Set(),squares=new Set();
 const rackIds=new Set(game.racks[game.turn].map(t=>t.id));
 for(const p of value){
   if(!p||!Number.isInteger(p.row)||!Number.isInteger(p.col)||!inBounds(p.row,p.col)||
      !rackIds.has(p.tileId)||ids.has(p.tileId)||game.board[p.row][p.col]!==null||
      squares.has(key(p.row,p.col))||
      (p.as!==undefined && !/^[A-Z]$/.test(p.as)))return [];
   ids.add(p.tileId);squares.add(key(p.row,p.col));
 }
 return value;
}
let theme=safeStorage.get(THEME)||'sophisticated',draft=validDraft(saved?.draft,state),selected=null,swapping=false;
function persist(){safeStorage.set(STORE,JSON.stringify({version:2,game:state,draft}));}
function say(message){$('hint').textContent=message;}
function block(tile,css='',label=tileFace(tile)){
    const el=document.createElement('span');el.className=`block ${css}`;el.dataset.color=tile.id%4;
    if(tile.flipped){el.classList.add('flipped');el.dataset.flipped='true';}
    const face=document.createElement('span');face.className='face';face.textContent=label==='?'?'★':label;
    el.append(face);
    if(tile.flipped){const mark=document.createElement('span');mark.className='flip-mark';mark.textContent='↻';mark.setAttribute('aria-hidden','true');el.append(mark);}
    const pts=document.createElement('span');pts.className='points';pts.textContent=tileValue(tile);
    el.append(pts);return el;
}
function tileAt(row,col){return draft.find(p=>p.row===row&&p.col===col);}
let activeCell=112;
function focusBoardCell(index){
 activeCell=Math.min(224,Math.max(0,index));
 const cells=$('board').querySelectorAll('.sq');
 cells.forEach((cell,i)=>cell.tabIndex=i===activeCell?0:-1);
 cells[activeCell]?.focus();
}
$('board').addEventListener('keydown',event=>{
 const cell=event.target.closest('.sq');if(!cell)return;
 const idx=Array.prototype.indexOf.call($('board').children,cell);
 if(idx<0)return;
 const row=Math.floor(idx/15),col=idx%15;
 let next=idx;
 if(event.key==='ArrowUp')next=Math.max(0,row-1)*15+col;
 else if(event.key==='ArrowDown')next=Math.min(14,row+1)*15+col;
 else if(event.key==='ArrowLeft')next=row*15+Math.max(0,col-1);
 else if(event.key==='ArrowRight')next=row*15+Math.min(14,col+1);
 else if(event.key==='Home')next=row*15;
 else if(event.key==='End')next=row*15+14;
 else return;
 event.preventDefault();focusBoardCell(next);
});
function render(){
 document.body.classList.toggle('playful',theme==='playful');
 document.body.classList.toggle('blocks-mode',state.mode==='blocks');
 $('game-mode').value=state.mode;
 const canFlip=state.mode==='blocks'&&!swapping&&selected!==null&&state.racks[state.turn].some(t=>t.id===selected&&t.alternate&&!t.blank);
 const flipBtn=$('flip');flipBtn.hidden=state.mode!=='blocks';flipBtn.disabled=!canFlip||state.finished;
 flipBtn.setAttribute('aria-label',canFlip?'Flip selected letter to its alternate face':'Select a nonblank rack tile to flip');
 $('flip-explain').textContent=state.mode==='blocks'?'Block Flip: select a tile, then tap ↻ Flip to switch its letter. Flipped points halve (minimum 1). Recall any staged tile to flip it.':'Classic rules · no flipping';
$('theme').lastElementChild.textContent=theme==='playful'?'Playful':'Sophisticated';$('score0').textContent=state.scores[0];$('score1').textContent=state.scores[1];$('player0').classList.toggle('active',state.turn===0);$('player1').classList.toggle('active',state.turn===1);$('turn-label').textContent=state.finished?`Game over · ${state.winner==='tie'?'Tie':`Player ${state.winner+1} wins`}`:`Player ${state.turn+1}'s turn`;$('bag-count').textContent=`${state.bag.length} letters left`;
 const board=$('board');const hadBoardFocus=board.contains(document.activeElement);board.replaceChildren();for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const el=document.createElement('button');el.type='button';el.className='sq';el.tabIndex=(r*SIZE+c===activeCell)?0:-1;el.setAttribute('role','gridcell');el.setAttribute('aria-label',`Row ${r+1}, column ${c+1}`);const fixed=state.board[r][c],pending=tileAt(r,c),bonus=PREMIUM[r][c];if(bonus)el.classList.add('premium-'+bonus);if(r===7&&c===7)el.classList.add('center');if(fixed){el.append(block({...fixed.tile,flipped:!!fixed.flipped},'',fixed.as));el.setAttribute('aria-label',`Row ${r+1}, column ${c+1}, ${fixed.as}, ${fixed.points ?? fixed.tile.points} points${fixed.flipped?', alternate face':''}`);}else if(pending){const tile=state.racks[state.turn].find(t=>t.id===pending.tileId);if(tile)el.append(block(tile,'placed',pending.as||tileFace(tile)));el.setAttribute('aria-label',`Pending ${tile?tileFace(tile):''} at row ${r+1}, column ${c+1}; tap to recall`);}else if(bonus){const b=document.createElement('span');b.className='bonus';b.textContent=r===7&&c===7?'★':bonus;el.append(b);}el.addEventListener('click',()=>tapSquare(r,c));board.append(el);}
 if(hadBoardFocus)board.children[activeCell]?.focus({preventScroll:true});
 const rack=$('rack');rack.replaceChildren();for(const tile of state.racks[state.turn]){if(draft.some(p=>p.tileId===tile.id))continue;const b=block(tile,selected===tile.id?'selected':'');b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',`${tile.blank?'Blank':tileFace(tile)}, ${tileValue(tile)} points${tile.flipped?', flipped alternate face':''}${selected===tile.id?', selected':''}`);const choose=()=>{if(swapping){if(!swapIds.has(tile.id))swapIds.add(tile.id);else swapIds.delete(tile.id);say(`${swapIds.size} tile(s) selected to swap. Tap Swap again to confirm.`);}else{selected=selected===tile.id?null:tile.id;say(selected?'Tap a board square to place your letter.':'Select a letter to place.');}render();};b.addEventListener('click',choose);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});if(swapIds.has(tile.id))b.classList.add('selected');rack.append(b);}
 $('history').replaceChildren();const items=state.history.slice(-8).reverse();if(!items.length){const li=document.createElement('li');li.textContent='No moves yet. The board is yours!';$('history').append(li);}for(const m of items){const li=document.createElement('li');li.textContent=`P${m.player+1} ${m.kind==='play'?`${m.words.join(' + ')} · +${m.score}`:m.kind}`;$('history').append(li);}
 $('play').disabled=state.finished;$('pass').disabled=state.finished;$('swap').disabled=state.finished;}
let swapIds=new Set();
function placeSelected(row,col,as){
 const tile=state.racks[state.turn].find(t=>t.id===selected);
 if(!tile)return;
 draft.push({row,col,tileId:selected,flipped:!!tile.flipped,...(as?{as}:{})});
 selected=null;persist();render();say(`${draft.length} letter(s) placed. Select another or press Play word.`);
}
let pendingBlank=null;
function clearPendingBlank(){pendingBlank=null;selected=null;render();}
$('blank-picker').addEventListener('close',()=>{
 if(pendingBlank)clearPendingBlank();
});
$('blank-cancel').addEventListener('click',()=>{
 // Reset immediately so a fast tap cannot reuse a stale blank selection.
 // The close listener still handles Escape and native dialog dismissal.
 if(pendingBlank)clearPendingBlank();
 $('blank-picker').close();
});
$('blank-confirm').addEventListener('click',()=>{
 if(!pendingBlank)return;
 const letter=$('blank-letter').value;
 if(!/^[A-Z]$/.test(letter))return;
 const {row,col}=pendingBlank;
 pendingBlank=null;
 $('blank-picker').close();
 placeSelected(row,col,letter);
});
function tapSquare(row,col){
 if(state.finished||pendingBlank)return;
 const existing=tileAt(row,col);
 if(existing){draft=draft.filter(p=>p!==existing);selected=existing.tileId;persist();say('Letter recalled. Select its new square.');render();return;}
 if(state.board[row][col])return;
 if(selected===null){say('Choose a letter from your rack first.');return;}
 const tile=state.racks[state.turn].find(t=>t.id===selected);if(!tile)return;
 if(tile.blank){pendingBlank={row,col};$('blank-letter').value='A';$('blank-picker').showModal();$('blank-letter').focus();return;}
 placeSelected(row,col);
}
function commit(move){try{const result=play(state,move,w=>validWord(w,state.dictionaryVersion||'starter-demo-1'));state=result.state;draft=[];selected=null;swapping=false;swapIds.clear();persist();render();if(move.kind==='play')say(`Played ${result.words.map(x=>x.word).join(' + ')} for ${result.score} points!`);else say(`${move.kind} completed.`);if(!state.finished)showDialog('Next player','Pass the device to Player '+(state.turn+1)+'. Their letters will appear when they tap Ready.');else showDialog('Game over',state.winner==='tie'?'It’s a tie!':`Player ${state.winner+1} wins. Final scores: ${state.scores.join(' – ')}.`);}catch(e){say(e.message);}}
function showDialog(title,message){$('dialog-title').textContent=title;$('dialog-message').textContent=message;$('dialog').showModal();}
$('play').addEventListener('click',()=>{if(!draft.length){say('Place at least one letter first.');return;}commit({kind:'play',placements:draft});});
$('recall').addEventListener('click',()=>{draft=[];selected=null;persist();render();say('All letters returned to rack.');});
$('pass').addEventListener('click',()=>{if(confirm('Pass your turn?'))commit({kind:'pass'});});
$('swap').addEventListener('click',()=>{if(draft.length){say('Recall your placed letters before swapping.');return;}if(!swapping){swapping=true;swapIds.clear();say('Select tiles to swap, then press Swap again.');render();return;}if(!swapIds.size){swapping=false;render();say('Swap canceled.');return;}commit({kind:'swap',tileIds:[...swapIds]});});
$('flip').addEventListener('click',()=>{
 if(state.mode!=='blocks'||selected===null||state.finished||swapping)return;
 const tile=state.racks[state.turn].find(t=>t.id===selected);
 if(!tile||tile.blank||!tile.alternate){say('This block cannot flip.');return;}
 tile.flipped=!tile.flipped;
 persist();render();
 say(`${tile.letter} ${tile.flipped?'flipped to '+tile.alternate:'returned to '+tile.letter} · ${tileValue(tile)} point${tileValue(tile)===1?'':'s'}.`);
});
$('game-mode').addEventListener('change',e=>{
 const mode=e.target.value;
 if(!(mode in MODES)||mode===state.mode)return;
 if(!confirm('Start a NEW '+MODES[mode]+' game? The current game will be replaced. Export it first if you want to keep it.')){e.target.value=state.mode;return;}
 state=createGame(Math.random,DICTIONARY_VERSION,mode);
 draft=[];selected=null;swapping=false;swapIds.clear();persist();render();
 say(mode==='blocks'?'Block Flip started: select a block, then tap ↻ Flip to use its alternate letter.':'Classic game started: no flipped letters.');
});
$('shuffle').addEventListener('click',()=>{state.racks[state.turn].sort(()=>Math.random()-.5);persist();render();});
$('theme').addEventListener('click',()=>{theme=theme==='playful'?'sophisticated':'playful';safeStorage.set(THEME,theme);render();});
$('rules').addEventListener('click',()=>showDialog('How to play',`Classic uses familiar 7-tile word-game rules. Block Flip uses 104 dual-face blocks: select a rack tile and tap Flip to change its letter. Its score becomes max(1, floor(original points/2)); blanks stay at zero. Flips are free before submission and locked when played. You may recall a staged tile to flip it. Every word must connect. DL/TL multiply letters; DW/TW multiply words. Use all 7 tiles for +40 points. Offline ENABLE2K dictionary: ${dictionarySize.toLocaleString()} words (2–15 letters).`));
$('reset').addEventListener('click',()=>{if(!confirm('Delete the current local game permanently and start fresh?'))return;safeStorage.remove(STORE);state=createGame(Math.random,DICTIONARY_VERSION,state.mode);draft=[];selected=null;swapping=false;swapIds.clear();persist();render();say('Local game deleted. New game ready.');});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>1_000_000)throw new Error('Save file is too large');
  const obj=JSON.parse(await f.text());const game=obj.game;
  if(!game||!Array.isArray(game.board)||game.board.length!==15||game.board.some(row=>!Array.isArray(row)||row.length!==15)||
    !Array.isArray(game.racks)||game.racks.length!==2||!Array.isArray(game.bag)||
    !Array.isArray(game.scores)||game.scores.length!==2||!['classic','blocks'].includes(game.mode||'classic')||
    !Number.isInteger(game.turn)||game.turn<0||game.turn>1||!Array.isArray(game.history))throw new Error('Invalid Jargon save format');
  if(!confirm('Replace your current game with this imported save?'))return;
  state=game;state.mode||='classic';draft=validDraft(obj.draft,state);selected=null;swapping=false;swapIds.clear();persist();render();
  say('Game imported locally. Your save never left this device.');
 }catch(error){say('Import failed: '+error.message);}finally{e.target.value='';}
});
$('export').addEventListener('click',()=>{const json=JSON.stringify({version:2,exportedAt:new Date().toISOString(),game:state,draft},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='jargon-local-game.json';a.click();URL.revokeObjectURL(url);say('Game exported. The JSON includes both local players’ racks and tile bag. Keep it private.');});
render();document.body.classList.add('js-ready');say('Select a tile, then tap the board to place it.');
if(!safeStorage.set('__jargon_storage_check','1'))say('You can play here, but this file viewer may not save progress. For reliable saving, open Jargon in Safari.');else safeStorage.remove('__jargon_storage_check');
