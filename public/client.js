const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let players = {};
let myId = null;

// Recibir datos iniciales de jugadores
socket.on('init', data => {
  players = data;
});

// Nuevo jugador se une
socket.on('new-player', data => {
  players[data.id] = data;
});

// Jugador se mueve
socket.on('player-moved', data => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].y = data.y;
  }
});

// Jugador recibe daño
socket.on('player-hit', ({ id, life }) => {
  if (players[id]) players[id].life = life;
});

// Jugador eliminado
socket.on('player-eliminated', id => {
  delete players[id];
});

// Poder activado
socket.on('power-activated', id => {
  if (players[id]) players[id].usingPower = true;
});

// Poder finaliza
socket.on('power-ended', id => {
  if (players[id]) players[id].usingPower = false;
});

// Jugador desconectado
socket.on('player-disconnected', id => {
  delete players[id];
});

// Detectar teclas
document.addEventListener('keydown', e => {
  sendMovementFromKey(e.key);
  if (e.key === 'e') activatePower(); // tecla para poder
});

// Enviar movimiento al servidor
function sendMovementFromKey(key) {
  let dx = 0, dy = 0;
  if (key === 'w' || key === 'ArrowUp') dy = -5;
  if (key === 's' || key === 'ArrowDown') dy = 5;
  if (key === 'a' || key === 'ArrowLeft') dx = -5;
  if (key === 'd' || key === 'ArrowRight') dx = 5;
  socket.emit('move', { dx, dy });
}

// Activar poder
function activatePower() {
  socket.emit('activate-power');
  socket.emit('check-collisions');
}

// Botón táctil de poder
document.getElementById('power-btn')?.addEventListener('touchstart', () => {
  activatePower();
});

// Botones de movimiento táctil
document.getElementById('up')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowUp'));
document.getElementById('down')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowDown'));
document.getElementById('left')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowLeft'));
document.getElementById('right')?.addEventListener('touchstart', () => sendMovementFromKey('ArrowRight'));

// Dibujar juego
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in players) {
    const p = players[id];

    // Dibujar halo de poder si está activo
    if (p.usingPower) {
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(p.x - 10, p.y - 10, 40, 40);
    }

    // Dibujar jugador
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 20, 20);

    // Dibujar barra de vida
    ctx.fillStyle = 'red';
    ctx.fillRect(p.x, p.y - 10, 20, 4);
    ctx.fillStyle = 'green';
    const vidaWidth = Math.max(0, (p.life / 100) * 20);
    ctx.fillRect(p.x, p.y - 10, vidaWidth, 4);
  }

  requestAnimationFrame(draw);
}

draw();
