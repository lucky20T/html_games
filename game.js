(() => {
  const canvas = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const scoreEl = document.getElementById('score');
  const ctx = canvas.getContext('2d');

  // Logical size
  let W = 420, H = 640;
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const cssW = Math.min(420, Math.max(320, window.innerWidth * 0.9));
    canvas.style.width = cssW + 'px';
    canvas.style.height = (cssW * (H / W)) + 'px';
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssW * (H / W) * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Game state
  let bird, pipes, frames, score, running, started;

  function reset(){
    bird = {x:80, y:H/2, r:12, vel:0};
    pipes = [];
    frames = 0;
    score = 0;
    running = true;
    started = false;
    overlay.textContent = 'Press Space or Click to start';
    scoreEl.textContent = '0';
  }

  function spawnPipe(){
    const gap = 140;
    const minY = 80;
    const maxY = H - gap - 120;
    const top = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    pipes.push({x:W+40, top, bottom: top + gap, w:60});
  }

  function update(){
    if(!running) return;
    frames++;
    // Bird physics
    const gravity = 0.6;
    const maxVel = 12;
    bird.vel += gravity;
    bird.vel = Math.min(bird.vel, maxVel);
    bird.y += bird.vel;

    // Spawn pipes
    if(frames % 90 === 0) spawnPipe();

    // Move pipes
    for(let i=pipes.length-1;i>=0;i--){
      pipes[i].x -= 2.5;
      // Scoring
      if(!pipes[i].scored && pipes[i].x + pipes[i].w < bird.x){
        pipes[i].scored = true; score++; scoreEl.textContent = String(score);
      }
      if(pipes[i].x + pipes[i].w < -50) pipes.splice(i,1);
    }

    // Collisions
    if(bird.y - bird.r < 0 || bird.y + bird.r > H){
      gameOver();
    }
    for(const p of pipes){
      if(bird.x + bird.r > p.x && bird.x - bird.r < p.x + p.w){
        if(bird.y - bird.r < p.top || bird.y + bird.r > p.bottom){
          gameOver();
        }
      }
    }
  }

  function draw(){
    // Clear
    ctx.clearRect(0,0,W,H);
    // Background
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0,0,W,H);

    // Pipes
    for(const p of pipes){
      ctx.fillStyle = '#4bbf6b';
      // top
      ctx.fillRect(p.x, 0, p.w, p.top);
      // bottom
      ctx.fillRect(p.x, p.bottom, p.w, H - p.bottom);
      // pipe caps
      ctx.fillStyle = '#3aa45a';
      ctx.fillRect(p.x-6, p.top-12, p.w+12, 12);
      ctx.fillRect(p.x-6, p.bottom, p.w+12, 12);
    }

    // Ground
    ctx.fillStyle = '#d6a95b';
    ctx.fillRect(0, H-40, W, 40);

    // Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    const tilt = Math.max(-0.6, Math.min(0.8, bird.vel * 0.04));
    ctx.rotate(tilt);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.ellipse(0,0,bird.r*1.2,bird.r,0,0,Math.PI*2);
    ctx.fill();
    // eye
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bird.r*0.35, -3, 2.2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function loop(){
    update();
    draw();
    if(running) requestAnimationFrame(loop);
  }

  function flap(){
    if(!running) return;
    if(!started){ started = true; overlay.style.display = 'none'; }
    bird.vel = -9.5;
  }

  function gameOver(){
    running = false;
    overlay.style.display = 'block';
    overlay.textContent = 'Game Over — Click or Space to restart';
  }

  // Controls
  window.addEventListener('keydown', e => {
    if(e.code === 'Space'){
      e.preventDefault();
      if(!running){ reset(); loop(); }
      flap();
    }
  });
  canvas.addEventListener('mousedown', e => {
    if(!running){ reset(); loop(); }
    if(!started){ overlay.style.display='none'; started=true; }
    flap();
  });
  window.addEventListener('touchstart', e => {
    e.preventDefault();
    if(!running){ reset(); loop(); }
    if(!started){ overlay.style.display='none'; started=true; }
    flap();
  }, {passive:false});

  // Start
  reset();
  loop();

})();
