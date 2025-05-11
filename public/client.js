const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;
const VIEW_WIDTH = 500;
const VIEW_HEIGHT = 500;

canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

let fondo = new Image();
fondo.src = 'fondo.jpg';

let players = {};
let myId = null;
let playerName = localStorage.getItem('playerName') || prompt("Ingresa tu nombre:");
localStorage.setItem('playerName', playerName);


socket.on('connect', () => {
  myId = socket.id;
  socket.emit('set-name', playerName);
});

socket.on('init', data => {
  players = data;
});

socket.on('new-player', data => {
  players[data.id] = data;
});

socket.on('player-moved', data => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].y = data.y;
  }
});

socket.on('player-hit', ({ id, life }) => {
  if (players[id]) players[id].life = life;
});

socket.on('player-eliminated', id => {
  if (id === myId) {
    socket.emit('get-leaderboard');
  }
  delete players[id];
});

socket.on('power-activated', id => {
  if (players[id]) players[id].usingPower = true;
});

socket.on('power-ended', id => {
  if (players[id]) players[id].usingPower = false;
});

socket.on('player-disconnected', id => {
  delete players[id];
});

socket.on('name-updated', ({ id, name }) => {
  if (players[id]) players[id].name = name;
});

socket.on('leaderboard-data', data => {
  const list = document.getElementById('leaderboard-list');
  const box = document.getElementById('leaderboard');

  list.innerHTML = '';
  data.forEach((entry, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${entry.name} - ${entry.score} pts`;
    list.appendChild(li);
  });

  box.style.display = 'block';
});

document.addEventListener('keydown', e => {
  sendMovementFromKey(e.key);
  if (e.key === 'e') activatePower();
  if (e.key.toLowerCase() === 'l') {
    socket.emit('get-leaderboard');
  }
});

document.getElementById('power-btn')?.addEventListener('touchstart', () => activatePower());

let movementInterval = null;

function startMoving(key) {
  sendMovementFromKey(key);
  movementInterval = setInterval(() => sendMovementFromKey(key), 100);
}

function stopMoving() {
  clearInterval(movementInterval);
}

['up', 'down', 'left', 'right'].forEach(dir => {
  const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
  };

  const btn = document.getElementById(dir);
  if (btn) {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startMoving(keyMap[dir]);
    });
    btn.addEventListener('touchend', stopMoving);
    btn.addEventListener('touchcancel', stopMoving);
  }
});

function sendMovementFromKey(key) {
  let dx = 0, dy = 0;
  if (key === 'w' || key === 'ArrowUp') dy = -5;
  if (key === 's' || key === 'ArrowDown') dy = 5;
  if (key === 'a' || key === 'ArrowLeft') dx = -5;
  if (key === 'd' || key === 'ArrowRight') dx = 5;
  socket.emit('move', { dx, dy });
}

function activatePower() {
  socket.emit('activate-power');
  socket.emit('check-collisions');
}

function draw() {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (!myId || !players[myId]) {
    requestAnimationFrame(draw);
    return;
  }

  const me = players[myId];
  let cameraX = me.x + 10 - VIEW_WIDTH / 2;
  let cameraY = me.y + 10 - VIEW_HEIGHT / 2;

  cameraX = Math.max(0, Math.min(MAP_WIDTH - VIEW_WIDTH, cameraX));
  cameraY = Math.max(0, Math.min(MAP_HEIGHT - VIEW_HEIGHT, cameraY));

  if (fondo.complete) {
    ctx.drawImage(fondo, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
  }

  const indicators = { up: [], down: [], left: [], right: [] };

  for (let id in players) {
    const p = players[id];
    const drawX = p.x - cameraX;
    const drawY = p.y - cameraY;

    if (p.usingPower) {
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(drawX - 10, drawY - 10, 40, 40);
    }

    ctx.fillStyle = p.color;
    ctx.fillRect(drawX, drawY, 20, 20);

    if (id === myId) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX - 1, drawY - 1, 22, 22);
    }

    ctx.fillStyle = 'red';
    ctx.fillRect(drawX, drawY - 10, 20, 4);
    ctx.fillStyle = 'green';
    const vidaWidth = Math.max(0, (p.life / 100) * 20);
    ctx.fillRect(drawX, drawY - 10, vidaWidth, 4);

    if (p.name) {
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(id === myId ? `${p.name} (TÚ)` : p.name, drawX + 10, drawY - 15);
    }

    if (id !== myId) {
      if (p.y < cameraY) indicators.up.push(p.name);
      else if (p.y > cameraY + VIEW_HEIGHT) indicators.down.push(p.name);
      else if (p.x < cameraX) indicators.left.push(p.name);
      else if (p.x > cameraX + VIEW_WIDTH) indicators.right.push(p.name);
    }
  }

  ctx.fillStyle = 'white';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';

  if (indicators.up.length)
    ctx.fillText('⬆ ' + indicators.up.join(', '), VIEW_WIDTH / 2, 20);
  if (indicators.down.length)
    ctx.fillText('⬇ ' + indicators.down.join(', '), VIEW_WIDTH / 2, VIEW_HEIGHT - 10);
  if (indicators.left.length)
    ctx.fillText('⬅ ' + indicators.left.join(', '), 30, VIEW_HEIGHT / 2);
  if (indicators.right.length)
    ctx.fillText('➡ ' + indicators.right.join(', '), VIEW_WIDTH - 30, VIEW_HEIGHT / 2);

  requestAnimationFrame(draw);
}

draw();
document.getElementById('restart-btn')?.addEventListener('click', () => {
  location.reload();
});

