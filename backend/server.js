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

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room based on role if needed, or just broadcast to all
    socket.on('join-game', (role) => {
        console.log(`Socket ${socket.id} joined as ${role}`);
    });

    // Handle Fog of War updates
    // Data expected: { mapId: string, action: object, fullState?: array }
    // If we send fullState every time it might be heavy, but safer for sync. 
    // Or we send individual actions and clients append them.
    socket.on('fow-update', (data) => {
        // Broadcast to others (Players view)
        socket.broadcast.emit('fow-update', data);

        // Optionally save to DB here if we want real-time persistence per stroke,
        // otherwise we rely on the explicit "save" or periodic auto-save from GM client.
        // For robust app, let's auto-save periodically or on significant changes from client side API calls.
        // Here we just relay.
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

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
