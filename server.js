const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const players = {};

// Generar color aleatorio
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  return '#' + Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 16)]).join('');
}

// Cuando un cliente se conecta
io.on('connection', socket => {
  console.log(`Jugador conectado: ${socket.id}`);

  // Crear jugador nuevo
  players[socket.id] = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    color: getRandomColor(),
    life: 100,
    usingPower: false
  };

  // Enviar todos los jugadores al nuevo
  socket.emit('init', players);

  // Notificar a los demás del nuevo jugador
  socket.broadcast.emit('new-player', { id: socket.id, ...players[socket.id] });

  // Movimiento de jugador
  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx;
      players[socket.id].y += data.dy;

      // Limitar dentro del canvas (opcional)
      players[socket.id].x = Math.max(0, Math.min(780, players[socket.id].x));
      players[socket.id].y = Math.max(0, Math.min(580, players[socket.id].y));

      io.emit('player-moved', {
        id: socket.id,
        x: players[socket.id].x,
        y: players[socket.id].y
      });
    }
  });

  // Activar poder
  socket.on('activate-power', () => {
    if (players[socket.id]) {
      players[socket.id].usingPower = true;
      io.emit('power-activated', socket.id);

      // Desactivar poder después de 1 segundo
      setTimeout(() => {
        if (players[socket.id]) {
          players[socket.id].usingPower = false;
          io.emit('power-ended', socket.id);
        }
      }, 1000);
    }
  });

  // Verificar colisiones al usar poder
  socket.on('check-collisions', () => {
    const attacker = players[socket.id];
    if (!attacker || !attacker.usingPower) return;

    const halo = {
      x: attacker.x - 10,
      y: attacker.y - 10,
      size: 40
    };

    for (let id in players) {
      if (id !== socket.id) {
        const target = players[id];
        if (
          target.x < halo.x + halo.size &&
          target.x + 20 > halo.x &&
          target.y < halo.y + halo.size &&
          target.y + 20 > halo.y
        ) {
          target.life -= 10;
          if (target.life <= 0) {
            io.emit('player-eliminated', id);
            delete players[id];
          } else {
            io.emit('player-hit', { id, life: target.life });
          }
        }
      }
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('player-disconnected', socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
