// client.js actualizado con visibilidad 500x500, escala automática y orientación hacia otros jugadores
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
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (!myId || !players[myId]) {
    requestAnimationFrame(draw);
    return;
  }

  const me = players[myId];

  // Calcula la camara centrada en el jugador con limites
  let cameraX = me.x + 10 - VIEW_WIDTH / 2;
  let cameraY = me.y + 10 - VIEW_HEIGHT / 2;

  cameraX = Math.max(0, Math.min(MAP_WIDTH - VIEW_WIDTH, cameraX));
  cameraY = Math.max(0, Math.min(MAP_HEIGHT - VIEW_HEIGHT, cameraY));

  if (fondo.complete) {
    ctx.drawImage(fondo, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
  }

  const hints = [];

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

    // Agrega indicador de jugadores fuera de vista vertical
    if (id !== myId) {
      if (p.y < cameraY) hints.push(`⬆ ${p.name}`);
      else if (p.y > cameraY + VIEW_HEIGHT) hints.push(`⬇ ${p.name}`);
    }
  }

  // Dibujar pistas de jugadores fuera de vista
  ctx.fillStyle = 'white';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  hints.forEach((text, i) => {
    ctx.fillText(text, 10, VIEW_HEIGHT - 10 - (14 * i));
  });

  requestAnimationFrame(draw);
}

draw();
