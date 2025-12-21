(function(){
  const boardEl = document.getElementById('board');
  const turnEl = document.getElementById('turn');
  const statusEl = document.getElementById('status');
  const movesEl = document.getElementById('moves');
  const restartBtn = document.getElementById('restart');
  const modeSel = document.getElementById('mode');
  const diffSel = document.getElementById('difficulty');
  const botColorSel = document.getElementById('botColor');

  const PIECES = {
    w: {k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},
    b: {k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}
  };

  // board[row][col] where row 0 is top (black back rank), row 7 bottom (white back rank)
  let board = null;
  let turn = 'w';
  let selected = null;
  let legal = [];
  let history = [];
  let lastMove = null;

  function cloneBoard(b){ return b.map(r => r.map(c => c ? {...c} : null)); }

  function initBoard(){
    board = Array.from({length:8}, ()=>Array(8).fill(null));
    const back = ['r','n','b','q','k','b','n','r'];
    for(let c=0;c<8;c++){ board[0][c] = {type:back[c], color:'b', hasMoved:false}; board[1][c] = {type:'p',color:'b', hasMoved:false}; }
    for(let c=0;c<8;c++){ board[6][c] = {type:'p',color:'w', hasMoved:false}; board[7][c] = {type:back[c], color:'w', hasMoved:false}; }
    turn = 'w'; selected = null; legal = []; history = [];
    render(); updateStatus('Ready'); updateTurn(); renderMoves();
  }

  function render(){
    boardEl.innerHTML = '';
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const sq = document.createElement('div');
        sq.className = 'chess-square ' + (((r+c)%2===0)?'light':'dark');
        sq.dataset.r = r; sq.dataset.c = c;
        const piece = board[r][c];
        if(piece){ sq.textContent = PIECES[piece.color][piece.type]; }
        if(selected && selected.r==r && selected.c==c) sq.classList.add('highlight');
        // highlight legal moves and add move/capture indicators
        const lm = legal.find(m=>m.r==r&&m.c==c);
        if(lm){
          sq.classList.add('highlight');
          if(board[r][c]) sq.classList.add('can-capture'); else sq.classList.add('can-move');
        }
        // last move marker
        if(lastMove && ((lastMove.from.r==r && lastMove.from.c==c) || (lastMove.to.r==r && lastMove.to.c==c))){
          sq.classList.add('last-move');
        }
        sq.addEventListener('click', onSquareClick);
        boardEl.appendChild(sq);
      }
    }
  }

  function onSquareClick(e){
    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    const piece = board[r][c];
    if(selected){
      // if clicked on legal move
      const m = legal.find(x=>x.r==r&&x.c==c);
      if(m){ makeMove(selected, {r,c}); return; }
      // else if clicked own piece, change selection
      if(piece && piece.color===turn){ selected={r,c}; legal=getLegalMoves(r,c); render(); return; }
      // otherwise clear
      selected=null; legal=[]; render(); return;
    } else {
      if(piece && piece.color===turn){ selected={r,c}; legal=getLegalMoves(r,c); render(); }
    }
  }

  function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }

  function getLegalMoves(r,c, b = board){
    const p = b[r][c]; if(!p) return [];
    const moves = [];
    const dir = p.color==='w' ? -1 : 1;

    if(p.type==='p'){
      const oneR = r + dir;
      if(inBounds(oneR,c) && !b[oneR][c]) moves.push({r:oneR,c});
      const twoR = r + dir*2;
      if((p.color==='w' && r===6 || p.color==='b' && r===1) && inBounds(twoR,c) && !b[oneR][c] && !b[twoR][c]) moves.push({r:twoR,c});
      for(const dc of [-1,1]){
        const cr = r+dir, cc = c+dc;
        if(inBounds(cr,cc) && b[cr][cc] && b[cr][cc].color!==p.color) moves.push({r:cr,c:cc});
      }
    }

    if(p.type==='n'){
      const del = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr,dc] of del){ const rr=r+dr, cc=c+dc; if(inBounds(rr,cc) && (!b[rr][cc]||b[rr][cc].color!==p.color)) moves.push({r:rr,c:cc}); }
    }

    if(p.type==='b' || p.type==='r' || p.type==='q'){
      const dirs = [];
      if(p.type==='b' || p.type==='q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if(p.type==='r' || p.type==='q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      for(const [dr,dc] of dirs){
        let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){
          if(!b[rr][cc]) { moves.push({r:rr,c:cc}); }
          else { if(b[rr][cc].color!==p.color) moves.push({r:rr,c:cc}); break; }
          rr+=dr; cc+=dc;
        }
      }
    }

    if(p.type==='k'){
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(dr===0 && dc===0) continue; const rr=r+dr, cc=c+dc; if(inBounds(rr,cc) && (!b[rr][cc]||b[rr][cc].color!==p.color)) moves.push({r:rr,c:cc});
      }
      // Castling: only if king hasn't moved and not currently in check
      const enemy = (p.color === 'w') ? 'b' : 'w';
      if(!p.hasMoved && !isKingInCheck(p.color, b)){
        // kingside
        const rookK = b[r] && b[r][7];
        if(rookK && rookK.type==='r' && rookK.color===p.color && !rookK.hasMoved){
          let clear = true; for(let i=c+1;i<7;i++){ if(b[r][i]) { clear=false; break; } }
          if(clear){
            // ensure squares king passes through are not attacked
            if(!isSquareAttacked(r, c+1, enemy, b) && !isSquareAttacked(r, c+2, enemy, b)){
              moves.push({r:r, c:c+2, castle:'kingside'});
            }
          }
        }
        // queenside
        const rookQ = b[r] && b[r][0];
        if(rookQ && rookQ.type==='r' && rookQ.color===p.color && !rookQ.hasMoved){
          let clear = true; for(let i=c-1;i>0;i--){ if(b[r][i]) { clear=false; break; } }
          if(clear){
            if(!isSquareAttacked(r, c-1, enemy, b) && !isSquareAttacked(r, c-2, enemy, b)){
              moves.push({r:r, c:c-2, castle:'queenside'});
            }
          }
        }
      }
    }

    // Filter moves that leave king in check
    const legalFiltered = moves.filter(m=>{
      const b2 = cloneBoard(b);
      // move king
      b2[m.r][m.c] = b2[r][c]; b2[r][c]=null;
      // if castling, also move the rook in the simulated board
      if(m.castle){
        if(m.castle === 'kingside'){
          const rookFrom = 7, rookTo = m.c - 1;
          b2[r][rookTo] = b2[r][rookFrom]; b2[r][rookFrom] = null;
          if(b2[r][rookTo]) b2[r][rookTo].hasMoved = true;
        } else if(m.castle === 'queenside'){
          const rookFrom = 0, rookTo = m.c + 1;
          b2[r][rookTo] = b2[r][rookFrom]; b2[r][rookFrom] = null;
          if(b2[r][rookTo]) b2[r][rookTo].hasMoved = true;
        }
      }
      if(b2[m.r][m.c] && b2[m.r][m.c].type==='p' && (m.r===0 || m.r===7)) b2[m.r][m.c].type='q';
      return !isKingInCheck((p.color), b2);
    });

    return legalFiltered;
  }

  function findKing(color, b){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c] && b[r][c].type==='k' && b[r][c].color===color) return {r,c};
    return null;
  }

  function isSquareAttacked(r,c, byColor, b){
    // scan for pawn attacks
    const dir = byColor==='w' ? -1 : 1;
    for(const dc of [-1,1]){
      const pr = r + dir, pc = c + dc;
      if(inBounds(pr,pc) && b[pr][pc] && b[pr][pc].color===byColor && b[pr][pc].type==='p') return true;
    }
    // knights
    const nd = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr,dc] of nd){ const rr=r+dr, cc=c+dc; if(inBounds(rr,cc) && b[rr][cc] && b[rr][cc].color===byColor && b[rr][cc].type==='n') return true; }
    // straight lines and diagonals
    const qdirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    for(const [dr,dc] of qdirs){
      let rr=r+dr, cc=c+dc; let dist=1;
      while(inBounds(rr,cc)){
        if(b[rr][cc]){
          const t = b[rr][cc].type, col=b[rr][cc].color;
          if(col===byColor){
            if(dist===1 && t==='k') return true;
            if((dr===0||dc===0) && (t==='r'||t==='q')) return true;
            if((dr!==0 && dc!==0) && (t==='b'||t==='q')) return true;
          }
          break;
        }
        dist++; rr+=dr; cc+=dc;
      }
    }
    return false;
  }

  function isKingInCheck(color, b){
    const king = findKing(color, b); if(!king) return true; // no king => in check
    return isSquareAttacked(king.r, king.c, color==='w' ? 'b' : 'w', b);
  }

  function makeMove(from, to){
    const piece = board[from.r][from.c];
    if(!piece) return;
    // detect castling (king moves two files)
    const isCastling = piece.type === 'k' && Math.abs(to.c - from.c) === 2;
    // perform move
    const target = board[to.r][to.c];
    board[to.r][to.c] = piece; board[from.r][from.c] = null;
    // handle rook move for castling
    if(isCastling){
      const row = from.r;
      if(to.c > from.c){
        // kingside: rook from col 7 to to.c - 1
        const rookFrom = 7, rookTo = to.c - 1;
        board[row][rookTo] = board[row][rookFrom]; board[row][rookFrom] = null;
        if(board[row][rookTo]) board[row][rookTo].hasMoved = true;
      } else {
        // queenside: rook from col 0 to to.c + 1
        const rookFrom = 0, rookTo = to.c + 1;
        board[row][rookTo] = board[row][rookFrom]; board[row][rookFrom] = null;
        if(board[row][rookTo]) board[row][rookTo].hasMoved = true;
      }
    }
    // promotion
    if(piece.type==='p' && (to.r===0 || to.r===7)) board[to.r][to.c].type='q';
    // mark moved
    piece.hasMoved = true;
    // record last move coords for UI
    lastMove = { from:{r:from.r,c:from.c}, to:{r:to.r,c:to.c} };
    // record history simple SAN-like
    let moveText;
    if(isCastling){ moveText = (to.c > from.c) ? 'O-O' : 'O-O-O'; if(piece.color!=='w') moveText = '...' + moveText; }
    else moveText = `${piece.color==='w'? '': '...'}${piece.type.toUpperCase()} ${String.fromCharCode(97+from.c)}${8-from.r}-${String.fromCharCode(97+to.c)}${8-to.r}`;
    history.push(moveText); renderMoves();
    selected = null; legal = [];
    // swap turn
    turn = (turn==='w')?'b':'w'; updateTurn();
    // check status
    if(isKingInCheck(turn, board)){
      // check if checkmate/stalemate
      const anyMoves = playerHasAnyLegalMoves(turn);
      if(!anyMoves){ updateStatus((turn==='w'?'White':'Black') + ' in checkmate'); }
      else updateStatus((turn==='w'?'White':'Black') + ' in check');
    } else {
      const anyMoves = playerHasAnyLegalMoves(turn);
      if(!anyMoves) updateStatus('Stalemate'); else updateStatus('Ready');
    }
    render();
    // if mode is bot and it's bot's turn, trigger move
    if(modeSel.value === 'bot' && turn === botColorSel.value){
      setTimeout(()=> botMakeMove(), 250);
    }
  }

  // --- Bot / AI helpers ---
  function applyMoveOnBoard(b, from, to){
    const b2 = cloneBoard(b);
    b2[to.r][to.c] = b2[from.r][from.c]; b2[from.r][from.c] = null;
    if(b2[to.r][to.c] && b2[to.r][to.c].type==='p' && (to.r===0 || to.r===7)) b2[to.r][to.c].type='q';
    return b2;
  }

  function getAllLegalMoves(color, b){
    const moves = [];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = b[r][c]; if(p && p.color===color){ const ms = getLegalMoves(r,c,b); for(const m of ms) moves.push({from:{r,c}, to:m}); }
    }
    return moves;
  }

  function evaluateBoard(b, perspectiveColor){
    const val = {p:100,n:320,b:330,r:500,q:900,k:20000};
    let score = 0;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = b[r][c]; if(!p) continue; const v = val[p.type] || 0; score += (p.color===perspectiveColor ? v : -v);
    }
    return score;
  }

  function minimax(b, depth, alpha, beta, maximizingColor, perspective){
    if(depth===0) return {score: evaluateBoard(b, perspective)};
    const moves = getAllLegalMoves(maximizingColor, b);
    if(moves.length===0){
      // checkmate or stalemate
      if(isKingInCheck(maximizingColor, b)) return {score: -999999};
      return {score: 0};
    }
    let bestMove = null;
    if(maximizingColor === perspective){
      let maxEval = -Infinity;
      for(const mv of moves){
        const nb = applyMoveOnBoard(b, mv.from, mv.to);
        const res = minimax(nb, depth-1, alpha, beta, (maximizingColor==='w'?'b':'w'), perspective);
        if(res.score > maxEval){ maxEval = res.score; bestMove = mv; }
        alpha = Math.max(alpha, res.score);
        if(beta <= alpha) break;
      }
      return {score: maxEval, move: bestMove};
    } else {
      let minEval = Infinity;
      for(const mv of moves){
        const nb = applyMoveOnBoard(b, mv.from, mv.to);
        const res = minimax(nb, depth-1, alpha, beta, (maximizingColor==='w'?'b':'w'), perspective);
        if(res.score < minEval){ minEval = res.score; bestMove = mv; }
        beta = Math.min(beta, res.score);
        if(beta <= alpha) break;
      }
      return {score: minEval, move: bestMove};
    }
  }

  function botMakeMove(){
    const botColor = botColorSel.value;
    const level = diffSel.value;
    const all = getAllLegalMoves(botColor, board);
    if(all.length===0) return;
    let chosen = null;
    if(level === 'easy'){
      chosen = all[Math.floor(Math.random()*all.length)];
    } else {
      // medium: minimax depth 3
      const depth = 3;
      const res = minimax(board, depth, -Infinity, Infinity, botColor, botColor);
      chosen = res.move || all[Math.floor(Math.random()*all.length)];
    }
    if(chosen) makeMove(chosen.from, chosen.to);
  }

  function playerHasAnyLegalMoves(color){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p = board[r][c]; if(p && p.color===color){ const moves = getLegalMoves(r,c); if(moves.length>0) return true; }
    }
    return false;
  }

  function updateTurn(){ turnEl.textContent = (turn==='w') ? 'White' : 'Black'; }
  function updateStatus(t){ statusEl.textContent = t; }

  function renderMoves(){ movesEl.innerHTML = ''; for(let i=0;i<history.length;i++){ const li=document.createElement('li'); li.textContent=history[i]; movesEl.appendChild(li); } }

  restartBtn.addEventListener('click', ()=>{ initBoard(); });

  modeSel.addEventListener('change', ()=>{
    // if bot plays white and mode enabled, and it's bot's turn, trigger move
    if(modeSel.value==='bot' && botColorSel.value===turn){ setTimeout(()=> botMakeMove(), 300); }
  });
  botColorSel.addEventListener('change', ()=>{
    if(modeSel.value==='bot' && botColorSel.value===turn){ setTimeout(()=> botMakeMove(), 300); }
  });

  // initialize and render board squares
  (function buildSquares(){
    // boardEl will be filled by render(); ensure CSS grid applied
  })();

  initBoard();

  // expose for debugging
  window._chess = { board, initBoard };

})();
