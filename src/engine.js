// ===== Jargon pure rules engine =====
/** Jargon pure game engine. No storage, analytics, network, DOM, or platform dependencies. */
const SIZE = 15;
const RACK_SIZE = 7;
const BINGO = 40;
const RULES_VERSION = 'jargon-alpha-2';
const BLOCKS_DISTRIBUTION = {
    '?': [2,0,null], E:[13,1,'A'], A:[9,1,'E'], I:[8,1,'O'], O:[8,1,'U'],
    T:[7,1,'D'], R:[6,1,'S'], S:[5,1,'Z'], D:[5,2,'T'], N:[5,2,'M'],
    L:[4,2,'R'], U:[4,2,'I'], H:[4,3,'W'], G:[3,3,'K'], Y:[2,3,'I'],
    B:[2,4,'P'], C:[2,4,'K'], F:[2,4,'V'], M:[2,4,'N'], P:[2,4,'B'],
    W:[2,4,'H'], V:[2,5,'F'], K:[1,5,'C'], X:[1,8,'S'], J:[1,10,'G'],
    Q:[1,10,'U'], Z:[1,10,'S']
};
const MODES = Object.freeze({classic:'Classic',blocks:'Block Flip'});
function tileValue(tile,flipped=!!tile.flipped){return tile.blank?0:(flipped?Math.max(1,Math.floor(tile.points/2)):tile.points);}
function tileFace(tile,flipped=!!tile.flipped){return flipped&&tile.alternate?tile.alternate:tile.letter;}

const DISTRIBUTION = {
    A: [9, 1], B: [2, 3], C: [2, 3], D: [4, 2], E: [12, 1], F: [2, 4], G: [3, 2], H: [2, 4], I: [9, 1], J: [1, 8], K: [1, 5], L: [4, 1], M: [2, 3], N: [6, 1], O: [8, 1], P: [2, 3], Q: [1, 10], R: [6, 1], S: [4, 1], T: [6, 1], U: [4, 1], V: [2, 4], W: [2, 4], X: [1, 8], Y: [2, 4], Z: [1, 10], '?': [2, 0]
};
function bonuses() {
    // Original symmetrical pattern. Same bonus coordinates for all players, distinct from reference products.
    const a = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const set = (r, c, b) => { for (const [x, y] of [[r, c], [r, SIZE - 1 - c], [SIZE - 1 - r, c], [SIZE - 1 - r, SIZE - 1 - c], [c, r], [c, SIZE - 1 - r], [SIZE - 1 - c, r], [SIZE - 1 - c, SIZE - 1 - r]])
        a[x][y] = b; };
    set(0, 0, 'TW');
    set(1, 5, 'TL');
    set(2, 2, 'DW');
    set(3, 6, 'DL');
    set(4, 4, 'TL');
    set(5, 5, 'DW');
    set(0, 7, 'DW');
    set(7, 7, 'DW');
    return a;
}
const PREMIUM = bonuses();
function fullBag(mode='classic') {
    assert(mode in MODES, 'Unknown Jargon mode');
    const distribution=mode==='blocks'?BLOCKS_DISTRIBUTION:DISTRIBUTION;
    let id=1;
    return Object.entries(distribution).flatMap(([letter,[count,points,alternate]])=>
       Array.from({length:count},()=>({id:id++,letter,points,blank:letter==='?',
          ...(mode==='blocks'?{alternate:alternate||null,flipped:false}:{})})));
}
function shuffled(items, rand) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) {
    const u = rand();
    if (!Number.isFinite(u) || u < 0 || u >= 1)
        throw new Error('Invalid random source');
    const j = Math.floor(u * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; }
function draw(bag, n) { return bag.splice(0, Math.min(n, bag.length)); }
function createGame(rand=Math.random,dictionaryVersion=DICTIONARY_VERSION,mode='classic') {
    const bag=shuffled(fullBag(mode),rand);
    return {board:Array.from({length:SIZE},()=>Array(SIZE).fill(null)),bag,
        racks:[draw(bag,7),draw(bag,7)],scores:[0,0],turn:0,consecutiveScoreless:0,
        finished:false,winner:null,history:[],dictionaryVersion,rulesVersion:RULES_VERSION,mode};
}
function assert(cond, message) { if (!cond)
    throw new Error(message); }
function key(r, c) { return `${r},${c}`; }
function inBounds(r, c) { return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function occupied(board, r, c) { return inBounds(r, c) && board[r][c] !== null; }
function buildWord(board, r, c, axis) {
    const dr = axis === 'V' ? 1 : 0, dc = axis === 'H' ? 1 : 0;
    while (occupied(board, r - dr, c - dc)) {
        r -= dr;
        c -= dc;
    }
    const sq = [];
    while (occupied(board, r, c)) {
        sq.push({ row: r, col: c });
        r += dr;
        c += dc;
    }
    return sq;
}
function wordLetters(board, sq) { return sq.map(x => board[x.row][x.col].as).join(''); }
function scoreWord(board, sq, newPositions) {
    let letterSum = 0, wordMult = 1;
    for (const { row, col } of sq) {
        const cell = board[row][col];
        const bonus = newPositions.has(key(row, col)) ? PREMIUM[row][col] : null;
        letterSum += (cell.points ?? cell.tile.points) * (bonus === 'DL' ? 2 : bonus === 'TL' ? 3 : 1);
        wordMult *= bonus === 'DW' ? 2 : bonus === 'TW' ? 3 : 1;
    }
    return letterSum * wordMult;
}
function play(state, move, check, rand = Math.random) {
    assert(!state.finished, 'Game already finished');
    const player = state.turn, other = (1 - player);
    const next = { ...state, board: state.board.map(row => row.map(cell => cell ? { ...cell } : null)), bag: [...state.bag], racks: [[...state.racks[0]], [...state.racks[1]]], scores: [...state.scores], history: [...state.history] };
    let gain = 0;
    let entries = [];
    let summary = { player, kind: move.kind, score: 0, words: [] };
    if (move.kind === 'resign') {
        next.finished = true;
        next.winner = other;
        next.resigned = player;
    }
    else if (move.kind === 'pass') {
        next.consecutiveScoreless++;
    }
    else if (move.kind === 'swap') {
        assert(Array.isArray(move.tileIds) && move.tileIds.length > 0 && move.tileIds.length <= RACK_SIZE, 'Choose tiles to swap');
        assert(next.bag.length >= RACK_SIZE, 'At least seven tiles must remain to swap');
        assert(new Set(move.tileIds).size === move.tileIds.length, 'Duplicate tiles');
        const selected = move.tileIds.map(id => next.racks[player].find(t => t.id === id));
        assert(selected.every(Boolean), 'Tile not in rack');
        next.racks[player] = next.racks[player].filter(t => !move.tileIds.includes(t.id));
        const replacements = draw(next.bag, move.tileIds.length);
        next.racks[player].push(...replacements);
        next.bag.push(...selected.map(t=>({...t,flipped:false})));
        next.bag = shuffled(next.bag, rand);
        // Swap draws replacements before mixing the returned tiles into the remaining bag.
        next.consecutiveScoreless++;
    }
    else {
        const ps = move.placements;
        assert(Array.isArray(ps) && ps.length >= 1 && ps.length <= RACK_SIZE, 'Place 1 to 7 tiles');
        const positions = new Set(), ids = new Set();
        for (const p of ps) {
            assert(inBounds(p.row, p.col), 'Tile outside board');
            assert(!next.board[p.row][p.col], 'Square already occupied');
            assert(!positions.has(key(p.row, p.col)), 'Duplicate square');
            assert(!ids.has(p.tileId), 'Duplicate tile');
            positions.add(key(p.row, p.col));
            ids.add(p.tileId);
            const tile = next.racks[player].find(t => t.id === p.tileId);
            assert(tile, 'Tile not in rack');
            const flipped=p.flipped===true;
            assert(p.flipped===undefined||typeof p.flipped==='boolean','Invalid flip flag');
            assert(!flipped || (state.mode==='blocks' && !tile.blank && !!tile.alternate),
                'This tile cannot be flipped in the selected mode');
            const as=tile.blank?p.as?.toUpperCase():tileFace(tile,flipped);
            assert(!!as&&/^[A-Z]$/.test(as),'Tile must designate one A–Z letter');
            assert(!tile.blank || !flipped,'Blank tiles cannot flip');
            next.board[p.row][p.col]={tile:{...tile,flipped},as,owner:player,flipped,
                points:tileValue(tile,flipped)};
        }
        const rows = new Set(ps.map(p => p.row)), cols = new Set(ps.map(p => p.col));
        assert(rows.size === 1 || cols.size === 1, 'Tiles must form a single straight line');
        const axis = rows.size === 1 ? 'H' : 'V';
        // First locate the main word. For a single tile, infer the longer direction.
        let main = buildWord(next.board, ps[0].row, ps[0].col, axis);
        if (ps.length === 1) {
            const alt = buildWord(next.board, ps[0].row, ps[0].col, axis === 'H' ? 'V' : 'H');
            if (alt.length > main.length) {
                main = alt;
            }
        }
        assert(main.length > 1, 'A play must form a word of at least two letters');
        assert(ps.every(p => main.some(x => x.row === p.row && x.col === p.col)), 'Gaps in the placed word');
        const hasOld = state.board.some(row => row.some(Boolean));
        if (!hasOld)
            assert(main.some(p => p.row === 7 && p.col === 7), 'First word must cover center');
        else
            assert(ps.some(p => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => occupied(state.board, p.row + dr, p.col + dc))), 'Word must connect to existing tiles');
        const all = [main];
        const seen = new Set([main.map(p => key(p.row, p.col)).join('|')]);
        for (const p of ps) {
            const otherAxis = main.length > 1 && (main[0].row === main.at(-1).row) ? 'V' : 'H';
            const cross = buildWord(next.board, p.row, p.col, otherAxis);
            if (cross.length > 1) {
                const sig = cross.map(x => key(x.row, x.col)).join('|');
                if (!seen.has(sig)) {
                    seen.add(sig);
                    all.push(cross);
                }
            }
        }
        entries = all.map(squares => ({ word: wordLetters(next.board, squares), squares, score: scoreWord(next.board, squares, positions) }));
        assert(entries.every(w => check(w.word)), 'One or more words are not in the selected dictionary: ' + entries.filter(w => !check(w.word)).map(w => w.word).join(', '));
        gain = entries.reduce((n, w) => n + w.score, 0) + (ps.length === RACK_SIZE ? BINGO : 0);
        next.scores[player] += gain;
        next.racks[player] = next.racks[player].filter(t => !ids.has(t.id));
        next.racks[player].push(...draw(next.bag, RACK_SIZE - next.racks[player].length));
        next.consecutiveScoreless = 0;
        summary = { ...summary, score: gain, words: entries.map(w => w.word), placements: ps.map(p => ({ row: p.row, col: p.col, as: next.board[p.row][p.col].as, flipped:!!next.board[p.row][p.col].flipped })) };
    }
    next.history.push(summary);
    if (!next.finished && (next.consecutiveScoreless >= 6 || (next.bag.length === 0 && next.racks[player].length === 0))) {
        next.finished = true;
        const rem = next.racks.map(r => r.reduce((n, t) => n + t.points, 0));
        next.scores[0] -= rem[0];
        next.scores[1] -= rem[1];
        if (next.bag.length === 0 && next.racks[player].length === 0)
            next.scores[player] += rem[other];
        next.winner = next.scores[0] === next.scores[1] ? 'tie' : next.scores[0] > next.scores[1] ? 0 : 1;
    }
    if (!next.finished)
        next.turn = other;
    return { state: next, score: gain, words: entries };
}
function viewFor(state, player) {
    return { board: state.board.map(row => row.map(c => c ? { letter: c.as, points: c.points ?? c.tile.points, flipped:!!c.flipped, owner: c.owner } : null)), rack: state.racks[player].map(t => ({ ...t })), opponentTileCount: state.racks[(1 - player)].length, bagCount: state.bag.length, scores: state.scores, turn: state.turn, finished: state.finished, winner: state.winner, history: state.history, rulesVersion: state.rulesVersion, dictionaryVersion: state.dictionaryVersion, premiums: PREMIUM };
}

