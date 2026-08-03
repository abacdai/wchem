const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true },
  });
  io.on('connection', () => {
    // Realtime lab events are broadcast per user in emitLabEvent; no
    // room logic needed for a single-user lab scope.
  });
  return io;
}

function emitLabEvent(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, emitLabEvent };
