const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

canvas.width = MAP_WIDTH;
canvas.height = MAP_HEIGHT;

let fondo = new Image();
fondo.src = 'fondo.jpg';

let players = {};
let myId = null;
let playerName = prompt("Ingresa tu nombre:");

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
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  if (fondo.complete) {
    ctx.drawImage(fondo, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  for (let id in players) {
    const p = players[id];

    // Halo
    if (p.usingPower) {
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(p.x - 10, p.y - 10, 40, 40);
    }

    // Jugador
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 20, 20);

    // Borde si es uno mismo
    if (id === myId) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 1, p.y - 1, 22, 22);
    }

    // Vida
    ctx.fillStyle = 'red';
    ctx.fillRect(p.x, p.y - 10, 20, 4);
    ctx.fillStyle = 'green';
    const vidaWidth = Math.max(0, (p.life / 100) * 20);
    ctx.fillRect(p.x, p.y - 10, vidaWidth, 4);

    // Nombre
    if (p.name) {
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        id === myId ? `${p.name} (TÚ)` : p.name,
        p.x + 10,
        p.y - 15
      );
    }
  }

  requestAnimationFrame(draw);
}

draw();
