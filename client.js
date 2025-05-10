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
  let dx = 0, dy = 0;
  if (e.key === 'w') dy = -5;
  if (e.key === 's') dy = 5;
  if (e.key === 'a') dx = -5;
  if (e.key === 'd') dx = 5;
  socket.emit('move', { dx, dy });
});

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
