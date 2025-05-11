const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

let VIEW_WIDTH = window.innerWidth;
let VIEW_HEIGHT = window.innerHeight;

canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

let players = {};
let myId = null;

socket.on('connect', () => {
  myId = socket.id;
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

document.addEventListener('keydown', e => {
  sendMovementFromKey(e.key);
  if (e.key === 'e') activatePower();
});

document.getElementById('power-btn')?.addEventListener('touchstart', () => activatePower());
document.getElementById('up')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowUp'));
document.getElementById('down')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowDown'));
document.getElementById('left')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowLeft'));
document.getElementById('right')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowRight'));

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
  const cameraX = Math.max(0, Math.min(MAP_WIDTH - VIEW_WIDTH, me.x - VIEW_WIDTH / 2));
  const cameraY = Math.max(0, Math.min(MAP_HEIGHT - VIEW_HEIGHT, me.y - VIEW_HEIGHT / 2));

  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

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

    ctx.fillStyle = 'red';
    ctx.fillRect(drawX, drawY - 10, 20, 4);
    ctx.fillStyle = 'green';
    const vidaWidth = Math.max(0, (p.life / 100) * 20);
    ctx.fillRect(drawX, drawY - 10, vidaWidth, 4);
  }

  requestAnimationFrame(draw);
}

draw();
