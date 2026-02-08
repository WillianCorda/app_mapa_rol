const express = require('express');
const router = express.Router();
const fs = require('fs');
const Map = require('../models/Map');
const viewStore = require('../store/viewStore');
const multer = require('multer');
const path = require('path');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Get all maps (incluye viewState por mapa para que el GM restaure zoom/pan al refrescar)
router.get('/', async (req, res) => {
    try {
        const maps = await Map.find().sort({ createdAt: -1 });
        const list = maps.map((m) => {
            const out = m.toObject ? m.toObject() : { ...m };
            const view = viewStore.lastViewByMapId[m._id.toString()];
            if (view) out.viewState = view;
            return out;
        });
        res.json(list);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get active map (for player view mainly). Incluye viewState si el GM ya envió zoom/pan.
router.get('/active', async (req, res) => {
    try {
        const map = await Map.findOne({ isActive: true });
        if (!map) return res.status(404).json({ message: 'No active map' });
        const out = map.toObject ? map.toObject() : { ...map };
        const view = viewStore.lastViewByMapId[map._id.toString()];
        if (view) out.viewState = view;
        res.json(out);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new map (upload)
router.post('/', upload.single('file'), async (req, res) => {
    const { name, type } = req.body; // type can be 'image' or 'video'
    const url = req.file ? `/uploads/${req.file.filename}` : req.body.url; // Support both upload and external URL

    const map = new Map({
        name,
        type: type || 'image',
        url,
        fowInfo: [] // Start clean
    });

    try {
        const newMap = await map.save();
        res.status(201).json(newMap);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update FOW data
router.put('/:id/fow', async (req, res) => {
    try {
        console.log('FOW Update Request:', {
            mapId: req.params.id,
            fowInfoLength: req.body.fowInfo?.length,
            bodySize: JSON.stringify(req.body).length
        });

        // Use findByIdAndUpdate with versionKey disabled to avoid version conflicts
        // This is safe because FOW updates are append-only from the GM
        const map = await Map.findByIdAndUpdate(
            req.params.id,
            { fowInfo: req.body.fowInfo },
            {
                new: true,
                runValidators: false,
                // Bypass version checking for this specific update
                overwrite: false
            }
        );

        if (!map) {
            console.error('Map not found:', req.params.id);
            return res.status(404).json({ message: 'Map not found' });
        }

        console.log('FOW saved successfully');
        res.json(map);
    } catch (err) {
        console.error('FOW Update Error:', err.message, err.stack);
        res.status(500).json({ message: err.message });
    }
});

// Set active map
router.put('/:id/activate', async (req, res) => {
    try {
        // Deactivate others
        await Map.updateMany({}, { isActive: false });
        // Activate current
        const map = await Map.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.json(map);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a map
router.delete('/:id', async (req, res) => {
    try {
        const map = await Map.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ message: 'Map not found' });
        }
        // Remove file from uploads if it's a local path (e.g. /uploads/xxx)
        if (map.url && map.url.startsWith('/uploads/')) {
            const filename = path.basename(map.url);
            const filePath = path.join(__dirname, '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await Map.findByIdAndDelete(req.params.id);
        res.json({ message: 'Map deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
