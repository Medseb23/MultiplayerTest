const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let players = {};

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

socket.on('player-disconnected', id => {
  delete players[id];
});

document.addEventListener('keydown', e => {
  sendMovementFromKey(e.key);
});

// ✅ funciones para movimiento con teclas o botones
function sendMovementFromKey(key) {
  let dx = 0, dy = 0;
  if (key === 'w' || key === 'ArrowUp') dy = -5;
  if (key === 's' || key === 'ArrowDown') dy = 5;
  if (key === 'a' || key === 'ArrowLeft') dx = -5;
  if (key === 'd' || key === 'ArrowRight') dx = 5;
  socket.emit('move', { dx, dy });
}

// ✅ controles táctiles
document.getElementById('up').addEventListener('touchstart', () => sendMovementFromKey('ArrowUp'));
document.getElementById('down').addEventListener('touchstart', () => sendMovementFromKey('ArrowDown'));
document.getElementById('left').addEventListener('touchstart', () => sendMovementFromKey('ArrowLeft'));
document.getElementById('right').addEventListener('touchstart', () => sendMovementFromKey('ArrowRight'));

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in players) {
    const p = players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 20, 20);
  }
  requestAnimationFrame(draw);
}

draw();
