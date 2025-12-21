(() => {
  const canvas = document.getElementById('pmCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('pmScore');
  const livesEl = document.getElementById('pmLives');
  const restartBtn = document.getElementById('restart');

  const TILE = 20; // tile size in px
  const COLS = 28, ROWS = 31; // canvas designed 28x31 (classic-ish)

  // Simple map: '#' wall, '.' pellet, ' ' empty
  const rawMap = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.#  #.#   #.##.#   #.#  #.#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.##### ## #####.######',
    '     #.#   # ## #   #.#     ',
    '######.# ##       ## #.######',
    '      .  #       #  .      ',
    '######.# ######### #.######',
    '     #.#           #.#     ',
    '######.# ######### #.######',
    '      .  #       #  .      ',
    '######.# ##       ## #.######',
    '     #.#   # ## #   #.#     ',
    '######.##### ## #####.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.#  #.#   #.##.#   #.#  #.#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '############################'
  ];

  // Normalize map to ROWS x COLS (pad if needed)
  const map = [];
  for(let r=0;r<ROWS;r++){
    const row = (rawMap[r] || '').padEnd(COLS, ' ');
    map.push(row.split(''));
  }

  // game state
  let score = 0, lives = 3;
  // directions: 0=left,1=up,2=right,3=down. Use null for no movement.
  let pac = {x:14, y:23, dir:null, ndir:null, speed:5, mouth:0}; // speed in tiles/sec
  let ghosts = [ {x:13,y:11,dir:1,color:'#ff4b4b', speed:3}, {x:14,y:11,dir:2,color:'#4b8bff', speed:3} ];

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // scale for high-DPI
    const scale = canvas.width / (COLS * TILE);
    ctx.save(); ctx.scale(scale, scale);

    // draw map
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const ch = map[r][c];
      const px = c*TILE, py = r*TILE;
      if(ch === '#'){
        ctx.fillStyle = '#003300'; ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle = '#0a5'; ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
      } else if(ch === '.'){
        ctx.fillStyle = '#ffd'; ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 2,0,Math.PI*2); ctx.fill();
      } else if(ch === 'o'){
        ctx.fillStyle = '#ffd'; ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 6,0,Math.PI*2); ctx.fill();
      }
    }

    // draw pacman
    const px = pac.x * TILE + TILE/2, py = pac.y * TILE + TILE/2;
    pac.mouth = (pac.mouth + 0.2) % (Math.PI*2);
    const mouth = Math.abs(Math.sin(pac.mouth)) * 0.6;
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    let start = 0.25*Math.PI, end = -0.25*Math.PI;
    if(pac.dir === 0){ start = mouth*Math.PI; end = -mouth*Math.PI; } // left/right simplified
    if(pac.dir === 1){ start = 0.25*Math.PI; end = -0.25*Math.PI; }
    if(pac.dir === 2){ start = -0.25*Math.PI; end = 0.25*Math.PI; }
    ctx.moveTo(px,py);
    ctx.arc(px,py, TILE*0.45, start, Math.PI*2+end);
    ctx.fill();

    // ghosts
    for(const g of ghosts){
      const gx = g.x * TILE + TILE/2, gy = g.y * TILE + TILE/2;
      ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(gx,gy,TILE*0.42,Math.PI,0); ctx.fill();
      ctx.fillRect(gx-TILE*0.42, gy, TILE*0.84, TILE*0.42);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx-TILE*0.16,gy-TILE*0.06,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(gx+TILE*0.16,gy-TILE*0.06,4,0,Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  function tileAt(x,y){
    const r = Math.floor(y), c = Math.floor(x);
    if(r<0||r>=ROWS||c<0||c>=COLS) return '#';
    return map[r][c];
  }

  function canMoveTo(x,y){ // tile coords
    const r = Math.floor(y), c = Math.floor(x);
    if(r<0||r>=ROWS||c<0||c>=COLS) return false;
    return map[r][c] !== '#';
  }

  let lastTime = null;
  function step(dt){
    // dt is in seconds
    if(!dt) dt = 1/60;
    // handle desired direction on tile center
    if(Math.abs(pac.x - Math.round(pac.x)) < 0.01 && Math.abs(pac.y - Math.round(pac.y)) < 0.01){
      // snap to center to avoid drift
      pac.x = Math.round(pac.x); pac.y = Math.round(pac.y);
      if(pac.ndir !== null){
        const nx = pac.x + (pac.ndir===0?-1: pac.ndir===2?1:0);
        const ny = pac.y + (pac.ndir===1?-1: pac.ndir===3?1:0);
        if(canMoveTo(nx, ny)){ pac.dir = pac.ndir; }
      }
      // if current dir is blocked, stop
      if(pac.dir !== null){
        const cx = pac.x + (pac.dir===0?-1: pac.dir===2?1:0);
        const cy = pac.y + (pac.dir===1?-1: pac.dir===3?1:0);
        if(!canMoveTo(cx,cy)){ pac.dir = null; }
      }
    }

    // move pac by dt-scaled amount
    if(pac.dir !== null){
      pac.x += (pac.dir===0?-1: pac.dir===2?1:0) * pac.speed * dt;
      pac.y += (pac.dir===1?-1: pac.dir===3?1:0) * pac.speed * dt;
    }
    // pellet consumption
    const tr = Math.floor(pac.y), tc = Math.floor(pac.x);
    if(map[tr] && map[tr][tc] === '.') { map[tr][tc] = ' '; score += 10; scoreEl.textContent = score; }

    // ghost simple movement (dt-scaled)
    for(const g of ghosts){
      const tryMove = () => {
        const dirs = [0,1,2,3].filter(d => {
          const nx = g.x + (d===0?-1: d===2?1:0);
          const ny = g.y + (d===1?-1: d===3?1:0);
          return canMoveTo(nx, ny);
        });
        if(dirs.length){
          // prefer continuing forward if possible
          if(dirs.includes(g.dir) && Math.random() > 0.3) return; // keep same dir
          g.dir = dirs[Math.floor(Math.random()*dirs.length)];
        }
      };
      if(Math.abs(g.x - Math.round(g.x)) < 0.01 && Math.abs(g.y - Math.round(g.y)) < 0.01){ tryMove(); g.x = Math.round(g.x); g.y = Math.round(g.y); }
      if(g.dir !== null){
        g.x += (g.dir===0?-1: g.dir===2?1:0) * g.speed * dt;
        g.y += (g.dir===1?-1: g.dir===3?1:0) * g.speed * dt;
      }

      // collision with pacman
      const dx = g.x - pac.x, dy = g.y - pac.y;
      if(Math.hypot(dx,dy) < 0.6){ // collision
        lives -= 1; livesEl.textContent = lives; resetPositions(); if(lives<=0) { alert('Game Over\nScore: '+score); resetGame(); }
      }
    }
  }

  function resetPositions(){
    pac.x = 14; pac.y = 23; pac.dir = 0; pac.ndir = 0;
    ghosts[0].x = 13; ghosts[0].y = 11; ghosts[1].x = 14; ghosts[1].y = 11;
  }

  function resetGame(){
    // rebuild map and reset score/lives
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ map[r][c] = (rawMap[r] && rawMap[r][c] === '.') ? '.' : (rawMap[r] && rawMap[r][c] === 'o' ? 'o' : (rawMap[r] && rawMap[r][c] === '#' ? '#' : ' ')); }
    score = 0; lives = 3; scoreEl.textContent = score; livesEl.textContent = lives; resetPositions();
  }

  // input
  window.addEventListener('keydown', e => {
    if(e.code === 'ArrowLeft' || e.key === 'a') pac.ndir = 0;
    if(e.code === 'ArrowUp' || e.key === 'w') pac.ndir = 1;
    if(e.code === 'ArrowRight' || e.key === 'd') pac.ndir = 2;
    if(e.code === 'ArrowDown' || e.key === 's') pac.ndir = 3;
  });

  restartBtn.addEventListener('click', ()=> resetGame());

  // sizing for high-dpi
  function resizeCanvas(){
    const cssW = canvas.clientWidth || 560;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = COLS * TILE * ratio;
    canvas.height = ROWS * TILE * ratio;
    canvas.style.width = (COLS * TILE) + 'px';
    canvas.style.height = (ROWS * TILE) + 'px';
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // game loop with delta time
  function loop(ts){
    if(!lastTime) lastTime = ts;
    const dt = Math.min(0.05, (ts - lastTime) / 1000); // clamp dt to avoid big jumps
    step(dt);
    draw();
    lastTime = ts;
    requestAnimationFrame(loop);
  }
  resetGame(); requestAnimationFrame(loop);

})();
