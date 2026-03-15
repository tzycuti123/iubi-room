import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const rooms = {};

// Helper to find roomId by host socketId
const findRoomByHost = (socketId) => {
  for (const id in rooms) {
    if (rooms[id].hostSocketId === socketId) return id;
  }
  return null;
};

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  socket.on('joinRoom', (roomId, hostToken, callback) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      // First person joins or room doesn't exist? 
      // Actually, if a room is created via Home, the cookie is set.
      // If someone joins with a token, they are the owner.
      rooms[roomId] = {
        queue: [],
        currentVideo: null,
        isPlaying: false,
        lastSeekTime: 0,
        lastKnownTimestamp: Date.now(),
        hostToken: hostToken, // First token provided becomes THE host token
        hostSocketId: socket.id
      };
      console.log(`Room ${roomId} created with host ${socket.id}`);
    } else {
      // Room exists. If provided token matches, update hostSocketId
      if (hostToken && rooms[roomId].hostToken === hostToken) {
        rooms[roomId].hostSocketId = socket.id;
        console.log(`Host re-connected to room ${roomId}`);
      }
    }
    
    const isHost = rooms[roomId].hostSocketId === socket.id;
    if (callback) callback({ ...rooms[roomId], isHost });
  });

  socket.on('addVideo', ({ roomId, video }) => {
    if (!rooms[roomId]) return;
    if (!rooms[roomId].currentVideo) {
      rooms[roomId].currentVideo = video;
      rooms[roomId].isPlaying = true;
      rooms[roomId].lastSeekTime = 0;
      rooms[roomId].lastKnownTimestamp = Date.now();
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
      rooms[roomId].isPlaying = true;
      rooms[roomId].lastSeekTime = 0;
      rooms[roomId].lastKnownTimestamp = Date.now();
    } else {
      rooms[roomId].currentVideo = null;
      rooms[roomId].isPlaying = false;
    }
    io.to(roomId).emit('syncState', rooms[roomId]);
  });

  socket.on('syncAction', ({ roomId, action, time }) => {
    if (!rooms[roomId]) return;
    
    // Only host can play/pause
    if (rooms[roomId].hostSocketId !== socket.id) {
       console.log("Blocked non-host action");
       return;
    }

    rooms[roomId].isPlaying = (action === 'play');
    rooms[roomId].lastSeekTime = time;
    rooms[roomId].lastKnownTimestamp = Date.now();
    
    socket.to(roomId).emit('actionSync', { action, time, by: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
    const hostRoomId = findRoomByHost(socket.id);
    if (hostRoomId) {
      console.log(`Host left room ${hostRoomId}, deleting room.`);
      io.to(hostRoomId).emit('roomClosed');
      delete rooms[hostRoomId];
    }
  });
});

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('IU BI Socket Server is running...');
});

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
