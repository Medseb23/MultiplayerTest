const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const players = {};
const leaderboardPath = path.join(__dirname, 'leaderboard.json');

// Leer leaderboard al iniciar
let leaderboard = [];
try {
  leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
} catch (e) {
  console.log("No se pudo leer leaderboard.json, se crea vacío.");
  leaderboard = [];
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  return '#' + Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 16)]).join('');
}

io.on('connection', socket => {
  console.log(`Jugador conectado: ${socket.id}`);

  players[socket.id] = {
    x: Math.floor(Math.random() * 900) + 50,
    y: Math.floor(Math.random() * 900) + 50,
    color: getRandomColor(),
    life: 100,
    usingPower: false,
    name: null,
    score: 0
  };

  socket.emit('init', players);
  socket.broadcast.emit('new-player', { id: socket.id, ...players[socket.id] });

  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x += data.dx;
      players[socket.id].y += data.dy;

      players[socket.id].x = Math.max(0, Math.min(980, players[socket.id].x));
      players[socket.id].y = Math.max(0, Math.min(980, players[socket.id].y));

      io.emit('player-moved', {
        id: socket.id,
        x: players[socket.id].x,
        y: players[socket.id].y
      });
    }
  });

  socket.on('activate-power', () => {
    if (players[socket.id]) {
      players[socket.id].usingPower = true;
      io.emit('power-activated', socket.id);

      setTimeout(() => {
        if (players[socket.id]) {
          players[socket.id].usingPower = false;
          io.emit('power-ended', socket.id);
        }
      }, 1000);
    }
  });

  socket.on('check-collisions', () => {
    const attacker = players[socket.id];
    if (!attacker || !attacker.usingPower) return;

    const halo = {
      x: attacker.x - 10,
      y: attacker.y - 10,
      size: 40
    };

    for (let id in players) {
      if (id !== socket.id && players[id]) {
        const target = players[id];

        if (
          target.x < halo.x + halo.size &&
          target.x + 20 > halo.x &&
          target.y < halo.y + halo.size &&
          target.y + 20 > halo.y
        ) {
          target.life -= 10;

          if (target.life <= 0) {
            if (attacker !== target && attacker) {
              attacker.score += 1;
            }

            // Guardar en leaderboard solo si el jugador aún existe y tiene nombre
            if (players[id] && players[id].name) {
              leaderboard.push({
                name: players[id].name,
                score: players[id].score || 0
              });
              leaderboard.sort((a, b) => b.score - a.score);
              fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
            }

            io.emit('player-eliminated', id);

            // Esperar un poco antes de eliminarlo para evitar errores por eventos pendientes
            setTimeout(() => {
              delete players[id];
            }, 100);
          } else {
            io.emit('player-hit', { id, life: target.life });
          }
        }
      }
    }
  });

  socket.on('set-name', name => {
    if (players[socket.id]) {
      players[socket.id].name = name;
      io.emit('name-updated', { id: socket.id, name });
    }
  });

  socket.on('get-leaderboard', () => {
    socket.emit('leaderboard-data', leaderboard.slice(0, 5));
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);

    if (players[socket.id]) {
      const player = players[socket.id];
      if (player.name && player.score > 0) {
        leaderboard.push({ name: player.name, score: player.score });
        leaderboard.sort((a, b) => b.score - a.score);
        fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
      }

      delete players[socket.id];
      io.emit('player-disconnected', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
