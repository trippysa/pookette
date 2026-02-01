/**
 * Theo Runner - An endless runner game featuring Theo the cat
 * Built with vanilla HTML5 Canvas
 */

(function() {
  'use strict';

  // ============== CONFIG ==============
  const CONFIG = {
    // Physics
    gravity: 0.6,
    jumpForce: -12,
    baseSpeed: 5,
    maxSpeed: 12,
    speedIncrement: 0.001,

    // Theo
    theoWidth: 50,
    theoHeight: 40,
    theoX: 80,
    groundY: 320,

    // Spawning
    minObstacleGap: 200,
    maxObstacleGap: 400,
    tunnelChance: 0.15,
    tunaChance: 0.3,

    // Colors
    colors: {
      sky: '#87CEEB',
      skyGradient: '#E0F6FF',
      ground: '#90EE90',
      groundDark: '#7BC77B',
      theo: '#FFFFFF',
      theoOutline: '#333333',
      orange: '#FFA500',
      orangeDark: '#E59400',
      bag: '#DDDDDD',
      bagOutline: '#999999',
      tunnel: '#8B4513',
      tunnelInner: '#5D2E0C',
      tuna: '#C0C0C0',
      tunaLabel: '#4169E1',
      cloud: 'rgba(255, 255, 255, 0.8)'
    }
  };

  // ============== GAME STATE ==============
  let canvas, ctx;
  let gameState = 'start'; // 'start', 'playing', 'gameover'
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('theoRunnerBest')) || 0;
  let soundEnabled = true;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shakeTime = 0;
  let speed = CONFIG.baseSpeed;

  // Theo state
  let theo = {
    x: CONFIG.theoX,
    y: CONFIG.groundY,
    vy: 0,
    isJumping: false,
    frame: 0,
    frameTime: 0
  };

  // World objects
  let obstacles = [];
  let collectibles = [];
  let tunnels = [];
  let clouds = [];
  let nextSpawnX = 500;

  // Audio context (simple beeps)
  let audioCtx = null;

  // ============== INITIALIZATION ==============
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Responsive canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Input handlers
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('mousedown', handleClick);

    // UI buttons
    document.getElementById('soundBtn').addEventListener('click', toggleSound);
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    // Update best score display
    document.getElementById('bestScore').textContent = bestScore;

    // Initialize clouds
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * canvas.width,
        y: 30 + Math.random() * 80,
        width: 60 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.3
      });
    }

    // Start game loop
    requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    const maxWidth = 800;
    const aspectRatio = 2; // 800:400
    const containerWidth = Math.min(window.innerWidth - 32, maxWidth);

    canvas.style.width = containerWidth + 'px';
    canvas.style.height = (containerWidth / aspectRatio) + 'px';
  }

  // ============== INPUT HANDLING ==============
  function handleKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
    if (e.code === 'KeyR') {
      restartGame();
    }
  }

  function handleKeyUp(e) {
    // Could add variable jump height here
  }

  function handleTouch(e) {
    e.preventDefault();
    jump();
  }

  function handleClick(e) {
    jump();
  }

  function jump() {
    if (gameState === 'start') {
      gameState = 'playing';
    }

    if (gameState === 'playing' && !theo.isJumping) {
      theo.vy = CONFIG.jumpForce;
      theo.isJumping = true;
      playSound('jump');
    }

    if (gameState === 'gameover') {
      restartGame();
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundBtn');
    btn.classList.toggle('active', soundEnabled);
  }

  function restartGame() {
    gameState = 'playing';
    score = 0;
    speed = CONFIG.baseSpeed;
    theo.y = CONFIG.groundY;
    theo.vy = 0;
    theo.isJumping = false;
    obstacles = [];
    collectibles = [];
    tunnels = [];
    nextSpawnX = 500;
    shakeTime = 0;
    document.getElementById('score').textContent = '0';
  }

  // ============== AUDIO ==============
  function playSound(type) {
    if (!soundEnabled) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      switch(type) {
        case 'jump':
          oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.1);
          break;
        case 'collect':
          oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.2);
          break;
        case 'hit':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.3);
          break;
      }
    } catch(e) {
      // Audio not supported
    }
  }

  // ============== GAME LOGIC ==============
  function update() {
    if (gameState !== 'playing') return;

    // Increase difficulty
    speed = Math.min(CONFIG.maxSpeed, speed + CONFIG.speedIncrement);

    // Update Theo physics
    theo.vy += CONFIG.gravity;
    theo.y += theo.vy;

    // Ground collision
    if (theo.y >= CONFIG.groundY) {
      theo.y = CONFIG.groundY;
      theo.vy = 0;
      theo.isJumping = false;
    }

    // Animation frame
    theo.frameTime += speed;
    if (theo.frameTime > 10) {
      theo.frame = (theo.frame + 1) % 2;
      theo.frameTime = 0;
    }

    // Move world objects
    moveObjects(obstacles);
    moveObjects(collectibles);
    moveObjects(tunnels);

    // Move clouds (parallax - slower)
    clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.width < 0) {
        cloud.x = canvas.width + Math.random() * 100;
        cloud.y = 30 + Math.random() * 80;
      }
    });

    // Spawn new objects
    spawnObjects();

    // Check collisions
    checkCollisions();

    // Update score
    score++;
    document.getElementById('score').textContent = Math.floor(score / 10);

    // Screen shake decay
    if (shakeTime > 0) {
      shakeTime--;
    }
  }

  function moveObjects(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].x -= speed;
      if (arr[i].x + arr[i].width < 0) {
        arr.splice(i, 1);
      }
    }
  }

  function spawnObjects() {
    if (nextSpawnX <= canvas.width) {
      // Decide what to spawn
      const rand = Math.random();

      if (rand < CONFIG.tunnelChance) {
        // Spawn tunnel (safe zone)
        tunnels.push({
          x: canvas.width,
          y: CONFIG.groundY - 50,
          width: 100,
          height: 60
        });
        // Spawn tuna inside tunnel
        collectibles.push({
          x: canvas.width + 35,
          y: CONFIG.groundY - 25,
          width: 30,
          height: 20,
          collected: false
        });
      } else {
        // Spawn obstacle (orange or bag)
        const isOrange = Math.random() > 0.5;
        obstacles.push({
          x: canvas.width,
          y: CONFIG.groundY - (isOrange ? 25 : 35),
          width: isOrange ? 30 : 35,
          height: isOrange ? 30 : 40,
          type: isOrange ? 'orange' : 'bag'
        });

        // Maybe spawn tuna above obstacle
        if (Math.random() < CONFIG.tunaChance) {
          collectibles.push({
            x: canvas.width,
            y: CONFIG.groundY - 80,
            width: 30,
            height: 20,
            collected: false
          });
        }
      }

      // Set next spawn distance (decreases with speed)
      const gap = CONFIG.minObstacleGap + Math.random() * (CONFIG.maxObstacleGap - CONFIG.minObstacleGap);
      nextSpawnX = canvas.width + gap * (CONFIG.baseSpeed / speed);
    }

    nextSpawnX -= speed;
  }

  function checkCollisions() {
    const theoBox = {
      x: theo.x + 5,
      y: theo.y - CONFIG.theoHeight + 5,
      width: CONFIG.theoWidth - 10,
      height: CONFIG.theoHeight - 5
    };

    // Check if in tunnel (safe)
    let inTunnel = false;
    for (const tunnel of tunnels) {
      if (boxCollision(theoBox, tunnel)) {
        inTunnel = true;
        break;
      }
    }

    // Check obstacle collision (only if not in tunnel)
    if (!inTunnel) {
      for (const obs of obstacles) {
        if (boxCollision(theoBox, obs)) {
          gameOver();
          return;
        }
      }
    }

    // Check collectible collision
    for (const coll of collectibles) {
      if (!coll.collected && boxCollision(theoBox, coll)) {
        coll.collected = true;
        score += 100;
        playSound('collect');
      }
    }
  }

  function boxCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  function gameOver() {
    gameState = 'gameover';
    playSound('hit');

    if (!reducedMotion) {
      shakeTime = 15;
    }

    const finalScore = Math.floor(score / 10);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      localStorage.setItem('theoRunnerBest', bestScore);
      document.getElementById('bestScore').textContent = bestScore;
    }
  }

  // ============== RENDERING ==============
  function render() {
    // Screen shake
    ctx.save();
    if (shakeTime > 0 && !reducedMotion) {
      ctx.translate(
        (Math.random() - 0.5) * shakeTime,
        (Math.random() - 0.5) * shakeTime
      );
    }

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.groundY);
    gradient.addColorStop(0, CONFIG.colors.sky);
    gradient.addColorStop(1, CONFIG.colors.skyGradient);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds (parallax background)
    clouds.forEach(cloud => {
      drawCloud(cloud.x, cloud.y, cloud.width);
    });

    // Ground
    ctx.fillStyle = CONFIG.colors.ground;
    ctx.fillRect(0, CONFIG.groundY + 10, canvas.width, canvas.height - CONFIG.groundY);

    // Ground line
    ctx.fillStyle = CONFIG.colors.groundDark;
    ctx.fillRect(0, CONFIG.groundY + 10, canvas.width, 5);

    // Draw tunnels
    tunnels.forEach(tunnel => {
      drawTunnel(tunnel);
    });

    // Draw obstacles
    obstacles.forEach(obs => {
      if (obs.type === 'orange') {
        drawOrange(obs);
      } else {
        drawBag(obs);
      }
    });

    // Draw collectibles
    collectibles.forEach(coll => {
      if (!coll.collected) {
        drawTuna(coll);
      }
    });

    // Draw Theo
    drawTheo();

    ctx.restore();

    // Draw overlays (not affected by shake)
    if (gameState === 'start') {
      drawOverlay('THEO RUNNER', 'Press SPACE or Tap to Start!', '#FFB6C1');
    } else if (gameState === 'gameover') {
      drawOverlay('GAME OVER', `Score: ${Math.floor(score/10)} | Press R or Tap to Restart`, '#FF6B6B');
    }
  }

  function drawCloud(x, y, width) {
    ctx.fillStyle = CONFIG.colors.cloud;
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.5, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(x - width * 0.3, y + 5, width * 0.3, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.3, y + 5, width * 0.35, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTheo() {
    const x = theo.x;
    const y = theo.y;
    const legOffset = theo.isJumping ? 0 : (theo.frame === 0 ? 3 : -3);

    ctx.save();

    // Body (white oval)
    ctx.fillStyle = CONFIG.colors.theo;
    ctx.strokeStyle = CONFIG.colors.theoOutline;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(x + 25, y - 20, 25, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(x + 45, y - 30, 15, 13, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 38, y - 40);
    ctx.lineTo(x + 42, y - 52);
    ctx.lineTo(x + 48, y - 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 48, y - 42);
    ctx.lineTo(x + 54, y - 52);
    ctx.lineTo(x + 58, y - 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = CONFIG.colors.theoOutline;
    ctx.beginPath();
    ctx.ellipse(x + 52, y - 32, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(x + 58, y - 28, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (animated)
    ctx.strokeStyle = CONFIG.colors.theoOutline;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Front legs
    ctx.beginPath();
    ctx.moveTo(x + 35, y - 5);
    ctx.lineTo(x + 38 + legOffset, y + 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 42, y - 5);
    ctx.lineTo(x + 45 - legOffset, y + 8);
    ctx.stroke();

    // Back legs
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 5);
    ctx.lineTo(x + 8 - legOffset, y + 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 18, y - 5);
    ctx.lineTo(x + 16 + legOffset, y + 8);
    ctx.stroke();

    // Tail
    ctx.strokeStyle = CONFIG.colors.theoOutline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.quadraticCurveTo(x - 15, y - 30 + Math.sin(Date.now() / 200) * 5, x - 10, y - 45);
    ctx.stroke();

    ctx.restore();
  }

  function drawOrange(obs) {
    ctx.save();

    // Orange body
    ctx.fillStyle = CONFIG.colors.orange;
    ctx.strokeStyle = CONFIG.colors.orangeDark;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.ellipse(obs.x + obs.width/2, obs.y - 2, 5, 3, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBag(obs) {
    ctx.save();

    // Bag body
    ctx.fillStyle = CONFIG.colors.bag;
    ctx.strokeStyle = CONFIG.colors.bagOutline;
    ctx.lineWidth = 2;

    // Crinkled bag shape
    ctx.beginPath();
    ctx.moveTo(obs.x + 5, obs.y + obs.height);
    ctx.lineTo(obs.x, obs.y + obs.height * 0.3);
    ctx.quadraticCurveTo(obs.x + obs.width/4, obs.y - 5, obs.x + obs.width/2, obs.y);
    ctx.quadraticCurveTo(obs.x + obs.width * 0.75, obs.y - 5, obs.x + obs.width, obs.y + obs.height * 0.3);
    ctx.lineTo(obs.x + obs.width - 5, obs.y + obs.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bag label
    ctx.fillStyle = '#666';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BAG', obs.x + obs.width/2, obs.y + obs.height * 0.6);

    ctx.restore();
  }

  function drawTunnel(tunnel) {
    ctx.save();

    // Outer tunnel
    ctx.fillStyle = CONFIG.colors.tunnel;
    ctx.beginPath();
    ctx.roundRect(tunnel.x, tunnel.y, tunnel.width, tunnel.height, 10);
    ctx.fill();

    // Inner opening
    ctx.fillStyle = CONFIG.colors.tunnelInner;
    ctx.beginPath();
    ctx.ellipse(tunnel.x + 5, tunnel.y + tunnel.height/2, 8, tunnel.height/2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(tunnel.x + tunnel.width - 5, tunnel.y + tunnel.height/2, 8, tunnel.height/2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#DEB887';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TUNNEL', tunnel.x + tunnel.width/2, tunnel.y + tunnel.height/2 + 4);

    ctx.restore();
  }

  function drawTuna(coll) {
    ctx.save();

    // Can body
    ctx.fillStyle = CONFIG.colors.tuna;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(coll.x, coll.y, coll.width, coll.height, 3);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = CONFIG.colors.tunaLabel;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TUNA', coll.x + coll.width/2, coll.y + coll.height/2 + 3);

    // Shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(coll.x + 2, coll.y + 2, 8, 4);

    ctx.restore();
  }

  function drawOverlay(title, subtitle, color) {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title box
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(canvas.width/2 - 180, canvas.height/2 - 60, 360, 120, 20);
    ctx.fill();

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 36px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width/2, canvas.height/2 - 10);

    // Subtitle
    ctx.fillStyle = '#666';
    ctx.font = '16px Quicksand, sans-serif';
    ctx.fillText(subtitle, canvas.width/2, canvas.height/2 + 30);
  }

  // ============== GAME LOOP ==============
  function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
  }

  // ============== START ==============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
