const express = require('express');
const http = require('http');
const socket = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.use(express.static('public'));

const players = {};

io.on('connection', socket => {
  console.log('Nuevo jugador:', socket.id);
  players[socket.id] = { x: 100, y: 100, color: getRandomColor() };

  socket.emit('init', players);
  socket.broadcast.emit('new-player', { id: socket.id, ...players[socket.id] });

  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx;
      players[socket.id].y += data.dy;
      io.emit('player-moved', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('player-disconnected', socket.id);
  });
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  return '#' + Array.from({length: 6}, () => letters[Math.floor(Math.random() * 16)]).join('');
}

server.listen(process.env.PORT || 3000, () => console.log('Servidor corriendo...'));
