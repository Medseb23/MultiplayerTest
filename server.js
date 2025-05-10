// NUEVO: Cada jugador ahora tiene vida y estado de poder
players[socket.id] = {
  x: 100,
  y: 100,
  color: getRandomColor(),
  life: 100,
  usingPower: false
};

// NUEVO: Activar poder (desde el cliente)
socket.on('activate-power', () => {
  if (players[socket.id]) {
    players[socket.id].usingPower = true;
    io.emit('power-activated', socket.id);

    // Después de 1 segundo, se apaga
    setTimeout(() => {
      if (players[socket.id]) {
        players[socket.id].usingPower = false;
        io.emit('power-ended', socket.id);
      }
    }, 1000);
  }
});

// NUEVO: Colisión y daño
socket.on('check-collisions', () => {
  const attacker = players[socket.id];
  if (!attacker || !attacker.usingPower) return;

  const halo = { x: attacker.x - 10, y: attacker.y - 10, size: 40 };

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
