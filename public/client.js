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

// Capturar el ID del jugador al conectarse
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

// Controles por teclado
document.addEventListener('keydown', e => {
  sendMovementFromKey(e.key);
  if (e.key === 'e') activatePower();
});

// Movimiento táctil
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

// Dibujo del juego
function draw() {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (!myId || !players[myId]) {
    requestAnimationFrame(draw);
    return;
  }

  const me = players[myId];

  const cameraX = Math.max(0, Math.min(MAP_WIDTH - VIEW_WIDTH, me.x - VIEW_WIDTH / 2));
  const cameraY = Math.max(0, Math.min(MAP_HEIGHT - VIEW_HEIGHT, me.y - VIEW_HEIGHT / 2));

  // Fondo del canvas
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  for (let id in players) {
    const p = players[id];
    const drawX = p.x - cameraX;
    const drawY = p.y - cameraY;

    // Halo
