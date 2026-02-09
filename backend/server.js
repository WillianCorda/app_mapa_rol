require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mapRoutes = require('./routes/maps');
const path = require('path');
const viewStore = require('./store/viewStore');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));
// Routes
app.use('/api/maps', mapRoutes);
const soundRoutes = require('./routes/sounds');
app.use('/api/sounds', soundRoutes);

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-game', (role) => {
        console.log(`Socket ${socket.id} joined as ${role}`);
    });

    socket.on('fow-update', (data) => {
        socket.broadcast.emit('fow-update', data);
    });

    socket.on('map-change', (mapId) => {
        io.emit('map-change', mapId);
    });

    socket.on('map-view-update', (data) => {
        if (data.mapId) {
            viewStore.lastViewByMapId[data.mapId] = {
                scale: data.scale,
                position: data.position,
                containerWidth: data.containerWidth,
                containerHeight: data.containerHeight,
            };
        }
        socket.broadcast.emit('map-view-update', data);
    });

    // Handle Audio Events
    socket.on('sound-play', (data) => {
        // data: { id, url, category, volume, loop }
        socket.broadcast.emit('sound-play', data);
    });

    socket.on('sound-stop', (data) => {
        // data: { category } or { id }
        socket.broadcast.emit('sound-stop', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
