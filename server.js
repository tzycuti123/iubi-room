import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  socket.on('joinRoom', (roomId, callback) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        queue: [],
        currentVideo: null,
      };
    }
    console.log(`User ${socket.id} joined room ${roomId}`);
    if (callback) callback(rooms[roomId]);
  });

  socket.on('addVideo', ({ roomId, video }) => {
    if (!rooms[roomId]) return;
    if (!rooms[roomId].currentVideo) {
      rooms[roomId].currentVideo = video;
    } else {
      rooms[roomId].queue.push(video);
    }
    io.to(roomId).emit('syncState', rooms[roomId]);
  });

  socket.on('removeVideo', ({ roomId, index }) => {
    if (!rooms[roomId]) return;
    if (index >= 0 && index < rooms[roomId].queue.length) {
      rooms[roomId].queue.splice(index, 1);
      io.to(roomId).emit('syncState', rooms[roomId]);
    }
  });

  socket.on('playNext', (roomId) => {
    if (!rooms[roomId]) return;
    if (rooms[roomId].queue.length > 0) {
      rooms[roomId].currentVideo = rooms[roomId].queue.shift();
    } else {
      rooms[roomId].currentVideo = null;
    }
    io.to(roomId).emit('syncState', rooms[roomId]);
  });

  socket.on('syncAction', ({ roomId, action, time }) => {
    // action: 'play' or 'pause' or 'seek'
    // Ensure all clients in room react out
    socket.to(roomId).emit('actionSync', { action, time, by: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('IU BI Socket Server is running...');
});

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
