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
  remove(key){try{window.localStorage.removeItem(key)}catch{} }
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
let opponentMode=saved?.opponent==='computer'?'computer':'local';
let botScheduled=false,botToken=0;
function persist(){safeStorage.set(STORE,JSON.stringify({version:2,game:state,draft,opponent:opponentMode}));}
function say(message){$('hint').textContent=message;}

const HAPTICS_KEY='jargon.haptics.v1';
let hapticsEnabled=safeStorage.get(HAPTICS_KEY)==='on';
function motionAllowed(){return !window.matchMedia||!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function haptic(kind){
  if(!hapticsEnabled||!motionAllowed()||typeof navigator.vibrate!=='function')return;
  const values={hover:5,tap:7,drop:[12,20,7],flip:10,success:[15,45,22],error:[25,35,25]};
  try{navigator.vibrate(values[kind]||7);}catch(_error){}
}
let dropTile=null,flipTile=null,shuffleMotion=false,pendingScore=null;
function scoreBurst(points,row,col){
  if(!motionAllowed()||!Number.isFinite(points)||points<=0)return;
  const wrap=$('board').parentElement,cell=$('board').children[row*SIZE+col];
  if(!wrap||!cell)return;
  wrap.querySelectorAll('.score-pop').forEach(node=>node.remove());
  const node=document.createElement('span');node.className='score-pop';
  node.textContent='+'+points;node.setAttribute('aria-hidden','true');
  const wr=wrap.getBoundingClientRect(),cr=cell.getBoundingClientRect();
  node.style.left=(cr.left-wr.left+cr.width/2)+'px';
  node.style.top=(cr.top-wr.top+cr.height/2)+'px';
  node.addEventListener('animationend',()=>node.remove(),{once:true});
  wrap.append(node);
}

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

// Draft direction affects only the optional double-tap helper; manual board taps always choose exact squares.
let lastRackTap=null;
let placementDirection='horizontal';
let cursorTarget=null;
function cursorAdvance(row,col){
  const vertical=placementDirection==='vertical';
  const dr=vertical?1:0,dc=vertical?0:1;
  let r=row+dr,c=col+dc;
  while(inBounds(r,c)&&(state.board[r][c]||tileAt(r,c))){r+=dr;c+=dc;}
  return inBounds(r,c)?{row:r,col:c}:null;
}
function setPlacementDirection(direction){
  if(direction!=='horizontal'&&direction!=='vertical')return;
  placementDirection=direction;
  lastRackTap=null;
  for(const button of document.querySelectorAll('[data-placement-direction]')){
    const active=button.dataset.placementDirection===direction;
    button.setAttribute('aria-pressed',String(active));
    button.classList.toggle('active',active);
  }
  if(cursorTarget)render();
  say(direction==='vertical'?'Vertical placement selected. Tap a tile, then a board square; double-tap extends downward.':'Horizontal placement selected. Tap a tile, then a board square; double-tap extends right.');
}
document.querySelectorAll('[data-placement-direction]').forEach(button=>button.addEventListener('click',()=>setPlacementDirection(button.dataset.placementDirection)));
function chooseAutoSquare(){
  if(state.finished)return null;
  const empty=state.board.every(row=>row.every(cell=>!cell));
  if(empty){
    if(!draft.length)return {row:7,col:7};
    if(!draft.some(p=>p.row===7&&p.col===7))return null;
  }
  if(!draft.length)return null; // Never guess on an established board without a draft.
  const vertical=placementDirection==='vertical';
  const fixed=vertical?draft[0].col:draft[0].row;
  if(!draft.every(p=>(vertical?p.col:p.row)===fixed))return null;
  const min=Math.min(...draft.map(p=>vertical?p.row:p.col));
  const max=Math.max(...draft.map(p=>vertical?p.row:p.col));
  // Skip already committed letters while extending a contiguous line.
  for(const step of [1,-1]){
    let next=step>0?max+1:min-1;
    while(next>=0&&next<SIZE){
      const row=vertical?next:fixed, col=vertical?fixed:next;
      if(tileAt(row,col))break;
      if(!state.board[row][col])return {row,col};
      next+=step;
    }
  }
  return null;
}
function autoPlaceTile(id){
  const tile=state.racks[state.turn].find(t=>t.id===id);
  if(state.finished||swapping||pendingBlank||!tile||tile.blank||draft.some(p=>p.tileId===id))return false;
  const cell=chooseAutoSquare();
  if(!cell){say('Choose a square on the board. Auto-place follows your chosen direction from the center or an aligned draft.');return false;}
  selected=id;
  tapSquare(cell.row,cell.col);
  return true;
}
function draftPreview(){
  const status=$('draft-preview');
  if(!draft.length){status.textContent='Place a tile to preview your word';status.dataset.status='empty';return;}
  try {
    const result=play(state,{kind:'play',placements:draft},word=>validWord(word,state.dictionaryVersion||'starter-demo-1'),()=>0.5);
    status.dataset.status='valid';
    status.textContent='✓ '+result.words.map(w=>w.word).join(' + ')+' · '+result.score+' points';
  }catch(error){
    status.dataset.status='incomplete';
    const message=String(error.message||'Incomplete word');
    const notFound=message.startsWith('One or more words are not in the selected dictionary:');
    status.textContent=notFound?'Not in dictionary: '+message.split(':').slice(1).join(':').trim():message;
  }
}

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

/* One-finger tile dragging: preview only until release. Tap and keyboard inputs remain unchanged. */
let tileDrag=null,lastTileDropAt=-1000;
function startTileDrag(event,tileId,source){
  if(!event.isPrimary||event.button!==0||state.finished||swapping||pendingBlank)return;
  if(tileDrag)return;
  const tile=state.racks[state.turn].find(t=>t.id===tileId);
  if(!tile)return;
  const startX=event.clientX,startY=event.clientY,origin=event.currentTarget;
  const drag={pointerId:event.pointerId,tileId,source,origin,startX,startY,active:false,ghost:null,target:null,frame:0,point:null};
  if(origin.setPointerCapture){try{origin.setPointerCapture(event.pointerId);}catch(_error){/* Unsupported or invalid pointer: window handlers still cover it. */}}
  tileDrag=drag;
  const locate=(x,y)=>{
    const square=document.elementFromPoint(x,y)?.closest('#board .sq');
    if(!square)return null;
    const index=Array.prototype.indexOf.call($('board').children,square);
    if(index<0)return null;
    const row=Math.floor(index/SIZE),col=index%SIZE;
    const old=source==='board'?draft.find(p=>p.tileId===tileId):null;
    if(state.board[row][col]||(tileAt(row,col)&&tileAt(row,col)!==old))return null;
    return {row,col,square};
  };
  const paintTarget=(hit)=>{
    if(drag.target?.square!==hit?.square){
      drag.target?.square.classList.remove('drag-target');
      drag.target=hit;
      hit?.square.classList.add('drag-target');
      if(hit&&drag.active)haptic('hover');
    }
  };
  const move=(e)=>{
    if(e.pointerId!==drag.pointerId)return;
    const delta=Math.hypot(e.clientX-startX,e.clientY-startY);
    if(!drag.active&&delta<9)return;
    if(!drag.active){
      drag.active=true;
      drag.ghost=block(tile,'tile-drag-ghost');
      drag.ghost.setAttribute('aria-hidden','true');
      const bounds=origin.getBoundingClientRect();
      drag.ghost.style.width=bounds.width+'px';
      drag.ghost.style.height=bounds.height+'px';
      document.body.append(drag.ghost);
      origin.classList.add('tile-drag-origin');
      lastRackTap=null;
    }
    drag.point={x:e.clientX,y:e.clientY};
    if(!drag.frame)drag.frame=requestAnimationFrame(()=>{
      drag.frame=0;
      if(tileDrag!==drag||!drag.point)return;
      const {x,y}=drag.point;
      if(drag.ghost)drag.ghost.style.transform='translate3d('+(x-20)+'px,'+(y-62)+'px,0) scale(1.12)';
      paintTarget(locate(x,y));
    });
  };
  const end=(e)=>{
    if(e.pointerId!==drag.pointerId)return;
    const hit=drag.active?locate(e.clientX,e.clientY):null;
    const active=drag.active;
    cleanup();
    if(!active)return; // No delay or change for the normal single-tap path.
    lastTileDropAt=performance.now();
    if(!hit){say('Drop a tile on an empty square to place it.');return;}
    if(source==='board'){
      const old=draft.find(p=>p.tileId===tileId);
      if(!old)return;
      old.row=hit.row;old.col=hit.col;
      persist();render();haptic('drop');say('Tile moved to row '+(hit.row+1)+', column '+(hit.col+1)+'.');
    }else{
      selected=tileId;
      tapSquare(hit.row,hit.col); // Uses existing blank picker, validation and local draft state.
    }
  };
  const cancel=(e)=>{if(e.pointerId===drag.pointerId)cleanup();};
  function cleanup(){
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',end);
    window.removeEventListener('pointercancel',cancel);
    window.removeEventListener('blur',cleanup);
    drag.origin.removeEventListener('lostpointercapture',lostCapture);
    if(drag.frame)cancelAnimationFrame(drag.frame);
    if(drag.origin.hasPointerCapture?.(drag.pointerId)){
      try{drag.origin.releasePointerCapture(drag.pointerId);}catch(_error){}
    }
    drag.target?.square.classList.remove('drag-target');
    drag.ghost?.remove();
    drag.origin.classList.remove('tile-drag-origin');
    if(tileDrag===drag)tileDrag=null;
  }
  const lostCapture=()=>cleanup();
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',cancel);
  window.addEventListener('blur',cleanup);
  drag.origin.addEventListener('lostpointercapture',lostCapture);
}

function render(){
  document.body.classList.toggle('playful',theme==='playful');
  document.body.classList.toggle('blocks-mode',state.mode==='blocks');
  $('game-mode').value=state.mode;
  $('opponent-mode').value=opponentMode;
  document.body.classList.toggle('bot-turn',opponentMode==='computer'&&state.turn===1);
  const canFlip=state.mode==='blocks'&&!swapping&&selected!==null&&state.racks[state.turn].some(t=>t.id===selected&&t.alternate&&!t.blank);
  const flipBtn=$('flip');flipBtn.hidden=state.mode!=='blocks';flipBtn.disabled=!canFlip||state.finished;
  flipBtn.setAttribute('aria-label',canFlip?'Flip selected letter to its alternate face':'Select a nonblank rack tile to flip');
  $('flip-explain').textContent=state.mode==='blocks'?'Block Flip: select a tile, then tap ↻ Flip to switch its letter. Flipped points halve (minimum 1). Recall any staged tile to flip it.':'Classic: no flips. Select a non-blank rack tile to create a word. Remember to cover the center square on the opening move.';
$('theme').lastElementChild.textContent=theme==='playful'?'Playful':'Sophisticated';$('score0').textContent=state.scores[0];$('score1').textContent=state.scores[1];$('player0').classList.toggle('active',state.turn===0);$('player1').classList.toggle('active',state.turn===1);$('turn-label').textContent=state.finished?`Game over · ${state.winner==='tie'?'Tie':`Player ${state.winner+1} wins`}`:opponentMode==='computer'?(state.turn===0?'Your turn':'Computer’s turn'):`Player ${state.turn+1}'s turn`;$('bag-count').textContent=`${state.bag.length} letters left`;
  const board=$('board');const hadBoardFocus=board.contains(document.activeElement);board.replaceChildren();for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const el=document.createElement('button');el.type='button';el.className='sq';el.tabIndex=(r*SIZE+c===activeCell)?0:-1;el.setAttribute('role','gridcell');el.setAttribute('aria-label',`Row ${r+1}, column ${c+1}`);const fixed=state.board[r][c],pending=tileAt(r,c),bonus=PREMIUM[r][c];if(bonus)el.classList.add('premium-'+bonus);if(r===7&&c===7)el.classList.add('center');if(fixed){el.classList.add('occupied');el.append(block({...fixed.tile,flipped:!!fixed.flipped},'',fixed.as));el.setAttribute('aria-label',`Row ${r+1}, column ${c+1}, ${fixed.as}, ${fixed.points ?? fixed.tile.points} points${fixed.flipped?', alternate face':''}`);}else if(pending){el.classList.add('occupied');const tile=state.racks[state.turn].find(t=>t.id===pending.tileId);if(tile)el.append(block(tile,'placed'+(dropTile===tile.id?' is-dropping':''),pending.as||tileFace(tile)));el.setAttribute('aria-label',`Pending ${tile?tileFace(tile):''} at row ${r+1}, column ${c+1}; tap to recall`);}else if(bonus){const b=document.createElement('span');b.className='bonus';b.textContent=r===7&&c===7?'★':bonus;el.append(b);}if(cursorTarget?.row===r&&cursorTarget.col===c&&!fixed&&!pending){
    el.classList.add('active-cursor',placementDirection==='vertical'?'dir-vertical':'dir-horizontal');
    const marker=document.createElement('span');marker.className='cursor-arrow';marker.setAttribute('aria-hidden','true');
    marker.innerHTML=placementDirection==='vertical'
      ?'<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3v17m-6-6 6 6 6-6"/></svg>'
      :'<svg viewBox="0 0 24 24" focusable="false"><path d="M3 12h17m-6-6 6 6-6 6"/></svg>';
    el.append(marker);
    el.setAttribute('aria-label',el.getAttribute('aria-label')+', active '+(placementDirection==='vertical'?'down':'across')+' placement cursor, tap again to change direction');
  }
  el.addEventListener('click',()=>{if(performance.now()-lastTileDropAt<300)return;tapSquare(r,c);});if(pending)el.addEventListener('pointerdown',event=>startTileDrag(event,pending.tileId,'board'));board.append(el);}
  if(hadBoardFocus)board.children[activeCell]?.focus({preventScroll:true});
  const rack=$('rack');rack.replaceChildren();for(const tile of state.racks[state.turn]){if(draft.some(p=>p.tileId===tile.id))continue;const b=block(tile,selected===tile.id?'selected':'');b.dataset.tileId=tile.id;b.addEventListener('pointerdown',event=>startTileDrag(event,tile.id,'rack'));if(flipTile===tile.id)b.classList.add('is-flipping');if(shuffleMotion){b.classList.add('is-shuffling');b.style.setProperty('--tile-index',rack.children.length);}b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',`${tile.blank?'Blank':tileFace(tile)}, ${tileValue(tile)} points${tile.flipped?', flipped alternate face':''}${selected===tile.id?', selected':''}`);const choose=()=>{haptic('tap');const now=performance.now();const repeat=!swapping&&lastRackTap&&lastRackTap.id===tile.id&&now-lastRackTap.at<400;lastRackTap={id:tile.id,at:now};if(repeat&&autoPlaceTile(tile.id))return;if(swapping){if(!swapIds.has(tile.id))swapIds.add(tile.id);else swapIds.delete(tile.id);say(`${swapIds.size} tile(s) selected to swap. Tap Swap again to confirm.`);}else{
    selected=selected===tile.id?null:tile.id;
    if(selected!==null&&cursorTarget){
      const target=cursorTarget;
      if(!state.board[target.row][target.col]&&!tileAt(target.row,target.col)){
        tapSquare(target.row,target.col);
        return;
      }
    }
    say(selected?'Tap a board square to place your letter.':'Select a letter to place.');
  }render();};b.addEventListener('click',()=>{if(performance.now()-lastTileDropAt<300)return;choose();});b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});if(swapIds.has(tile.id))b.classList.add('selected');rack.append(b);}
  $('history').replaceChildren();const items=state.history.slice(-8).reverse();if(!items.length){const li=document.createElement('li');li.textContent='No moves yet. The board is yours!';$('history').append(li);}for(const m of items){const li=document.createElement('li');li.textContent=`P${m.player+1} ${m.kind==='play'?`${m.words.join(' + ')} · +${m.score}`:m.kind}`;$('history').append(li);}
  $('player1').querySelector('.player-label').textContent=opponentMode==='computer'?'COMPUTER':'PLAYER TWO';
  $('player0').querySelector('.player-label').textContent=opponentMode==='computer'?'YOU':'PLAYER ONE';
  $('play').disabled=state.finished||(opponentMode==='computer'&&state.turn===1);$('pass').disabled=state.finished||(opponentMode==='computer'&&state.turn===1);$('swap').disabled=state.finished||(opponentMode==='computer'&&state.turn===1);draftPreview();dropTile=null;flipTile=null;shuffleMotion=false;}
let swapIds=new Set();
function placeSelected(row,col,as){
  const tile=state.racks[state.turn].find(t=>t.id===selected);
  if(!tile)return;
  draft.push({row,col,tileId:selected,flipped:!!tile.flipped,...(as?{as}:{})});
  dropTile=selected;selected=null;
  if(cursorTarget?.row===row&&cursorTarget.col===col)cursorTarget=cursorAdvance(row,col);
  persist();render();haptic('drop');say(`${draft.length} letter(s) placed. Select another or press Play word.`);
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
  lastRackTap=null;
  const existing=tileAt(row,col);
  if(existing){draft=draft.filter(p=>p!==existing);selected=existing.tileId;persist();say('Letter recalled. Select its new square.');render();return;}
  if(state.board[row][col])return;
  if(selected===null){
    if(cursorTarget?.row===row&&cursorTarget.col===col){
      setPlacementDirection(placementDirection==='horizontal'?'vertical':'horizontal');
    }else{
      cursorTarget={row,col};
      setPlacementDirection('horizontal');
      render();
    }
    say('Placement cursor at row '+(row+1)+', column '+(col+1)+'. Tap again to switch Across/Down, then tap letters from the rack.');
    return;
  }
  const tile=state.racks[state.turn].find(t=>t.id===selected);if(!tile)return;
  if(tile.blank){pendingBlank={row,col};$('blank-letter').value='A';$('blank-picker').showModal();$('blank-letter').focus();return;}
  placeSelected(row,col);
}
function botFinishedMessage(){return state.winner==='tie'?'It’s a tie!':(state.winner===0?'You win!':'Computer wins.');}
function scheduleBotTurn(){
  if(botScheduled||opponentMode!=='computer'||state.finished||state.turn!==1)return;
  botScheduled=true;
  const token=++botToken;
  $('turn-label').textContent='Computer is thinking…';
  // Yield once for paint. Candidate search is bounded, but a Web Worker is a future improvement.
  setTimeout(()=>{
    if(token!==botToken||opponentMode!=='computer'||state.turn!==1||state.finished){botScheduled=false;return;}
    try {
      const check=word=>validWord(word,state.dictionaryVersion||'starter-demo-1');
      const move=findBotMove(state,check,{difficulty:'beginner',seed:(state.history.length+1)*7919,maxTimeMs:170,maxEvaluations:1800});
      const result=play(state,move,check,()=>0.5);
      state=result.state;
      draft=[];selected=null;swapping=false;swapIds.clear();cursorTarget=null;
      persist();render();
      if(move.kind==='play')say('Computer played '+result.words.map(w=>w.word).join(' + ')+' for '+result.score+' points. Your turn.');
      else say('Computer passed. Your turn.');
      if(state.finished)showDialog('Game over',botFinishedMessage()+' Final scores: '+state.scores.join(' – ')+'.');
    }catch(error){
      say('Computer move failed: '+error.message+'. You can change opponent mode to restart.');
    }finally{botScheduled=false;}
  },80);
}
function commit(move){
  if(opponentMode==='computer'&&state.turn===1)return;
  lastRackTap=null;
  try {
    const result=play(state,move,w=>validWord(w,state.dictionaryVersion||'starter-demo-1'));
    state=result.state;draft=[];selected=null;swapping=false;swapIds.clear();cursorTarget=null;
    if(!state.finished&&opponentMode==='local')document.body.classList.add('handoff-lock');
    persist();render();
    if(move.kind==='play'&&result.score>0){
      const last=move.placements[move.placements.length-1];
      if(opponentMode==='local')pendingScore={points:result.score,row:last.row,col:last.col};
      haptic('success');
    }
    if(move.kind==='play')say('Played '+result.words.map(w=>w.word).join(' + ')+' for '+result.score+' points!');
    else say(move.kind+' completed.');
    if(!state.finished&&opponentMode==='computer')scheduleBotTurn();
    else if(!state.finished)showDialog('Pass the device','This is a two-person game on one device. Hand it to Player '+(state.turn+1)+', then they should tap Ready to reveal their letters. There is no online opponent in this mode.');
    else showDialog('Game over',opponentMode==='computer'?botFinishedMessage()+' Final scores: '+state.scores.join(' – ')+'.':(state.winner==='tie'?'It’s a tie!':`Player ${state.winner+1} wins. Final scores: ${state.scores.join(' – ')}.`));
  }catch(error){haptic('error');say(error.message);}
}
function showDialog(title,message){$('dialog-title').textContent=title;$('dialog-message').textContent=message;$('dialog-close').textContent=title==='Pass the device'?'Player '+(state.turn+1)+' — Ready to play':'Ready to play';$('haptics-row').hidden=title!=='How to play';$('haptics-setting').checked=hapticsEnabled;$('haptics-setting').disabled=typeof navigator.vibrate!=='function';$('dialog').showModal();}
$('haptics-setting').addEventListener('change',e=>{hapticsEnabled=!!e.target.checked;safeStorage.set(HAPTICS_KEY,hapticsEnabled?'on':'off');});
$('dialog').addEventListener('close',()=>{document.body.classList.remove('handoff-lock');if(pendingScore){const result=pendingScore;pendingScore=null;scoreBurst(result.points,result.row,result.col);}});
$('play').addEventListener('click',()=>{if(!draft.length){say('Place at least one letter first.');return;}commit({kind:'play',placements:draft});});
$('recall').addEventListener('click',()=>{draft=[];selected=null;persist();render();say('All letters returned to rack.');});
$('pass').addEventListener('click',()=>{if(confirm('Pass your turn?'))commit({kind:'pass'});});
$('swap').addEventListener('click',()=>{if(draft.length){say('Recall your placed letters before swapping.');return;}if(!swapping){swapping=true;swapIds.clear();say('Select tiles to swap, then press Swap again to confirm.');render();return;}const ids=[...swapIds];if(!ids.length){say('Select at least one tile to swap.');return;}commit({kind:'swap',tileIds:ids});});
$('flip').addEventListener('click',()=>{
  if(state.mode!=='blocks'||selected===null||state.finished||swapping)return;
  const tile=state.racks[state.turn].find(t=>t.id===selected);
  if(!tile||tile.blank||!tile.alternate){say('This block cannot flip.');return;}
  tile.flipped=!tile.flipped;
  flipTile=tile.id;persist();render();haptic('flip');
  say(`${tile.letter} ${tile.flipped?'flipped to '+tile.alternate:'returned to '+tile.letter} · ${tileValue(tile)} point${tileValue(tile)===1?'':'s'}.`);
});
$('opponent-mode').addEventListener('change',event=>{
  const mode=event.target.value;
  if(!['local','computer'].includes(mode)||mode===opponentMode)return;
  if(!confirm('Start a new '+(mode==='computer'?'Play Computer':'Pass-and-play')+' game? Save your current game with Export first if you want to keep it.')){
    event.target.value=opponentMode;return;
  }
  botToken++;botScheduled=false;document.body.classList.remove('handoff-lock');
  opponentMode=mode;state=createGame(Math.random,DICTIONARY_VERSION,state.mode);
  draft=[];selected=null;cursorTarget=null;swapping=false;swapIds.clear();
  persist();render();
  say(mode==='computer'?'Playing against the computer. Place a word and tap Play word.':'Two humans sharing one device. Pass it to the next player after submitting.');
});
$('game-mode').addEventListener('change',e=>{
  const mode=e.target.value;
  if(!(mode in MODES)||mode===state.mode)return;
  if(!confirm('Start a NEW '+MODES[mode]+' game? The current game will be replaced. Export it first if you want to keep it.')){e.target.value=state.mode;return;}
  botToken++;botScheduled=false;state=createGame(Math.random,DICTIONARY_VERSION,mode);
  draft=[];selected=null;cursorTarget=null;swapping=false;swapIds.clear();persist();render();
  say(mode==='blocks'?'Block Flip started: select a block, then tap ↻ Flip to use its alternate letter.':'Classic game started: no flipped letters.');
});
$('shuffle').addEventListener('click',()=>{state.racks[state.turn]=shuffled(state.racks[state.turn],Math.random);shuffleMotion=true;persist();render();haptic('tap');});
$('theme').addEventListener('click',()=>{theme=theme==='playful'?'sophisticated':'playful';safeStorage.set(THEME,theme);render();});
$('rules').addEventListener('click',()=>showDialog('How to play',`Classic uses familiar 7-tile word-game rules. Block Flip uses 104 dual-face blocks: select a rack tile and tap Flip to change its alternate face. Use only legal words from the local dictionary.`));
$('reset').addEventListener('click',()=>{if(!confirm('Delete the current local game permanently and start fresh?'))return;botToken++;botScheduled=false;safeStorage.remove(STORE);state=createGame(Math.random,DICTIONARY_VERSION,state.mode);draft=[];selected=null;cursorTarget=null;swapIds.clear();persist();render();say('A fresh game is ready.');});
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
   botToken++;botScheduled=false;state=game;state.mode||='classic';opponentMode=obj.opponent==='computer'?'computer':'local';draft=validDraft(obj.draft,state);selected=null;cursorTarget=null;swapping=false;swapIds.clear();persist();render();if(opponentMode==='computer'&&state.turn===1)scheduleBotTurn();
   say('Game imported locally. Your save never left this device.');
  }catch(error){say('Import failed: '+error.message);}finally{e.target.value='';}
});
$('export').addEventListener('click',()=>{const json=JSON.stringify({version:2,exportedAt:new Date().toISOString(),game:state,draft,opponent:opponentMode},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='jargon-save.json';a.click();URL.revokeObjectURL(url);say('Game exported as JSON.');});
render();document.body.classList.add('js-ready');say(opponentMode==='computer'?'Play against the computer: place your first word.':'Select a tile, then tap the board to place it.');if(opponentMode==='computer'&&state.turn===1)scheduleBotTurn();
if(!safeStorage.set('__jargon_storage_check','1'))say('You can play here, but this file viewer may not save progress. For reliable saving, open Jargon in Safari.');else safeStorage.remove('__jargon_storage_check');
