const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Sound = require('../models/Sound');

// Multer config for audio
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/sounds';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /mp3|wav|ogg|mpeg/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Solo archivos de audio (mp3, wav, ogg)'));
    }
});

// GET all sounds
router.get('/', async (req, res) => {
    try {
        const sounds = await Sound.find().sort({ createdAt: -1 });
        res.json(sounds);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new sound
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

        const newSound = new Sound({
            name: req.body.name || req.file.originalname,
            url: `/uploads/sounds/${req.file.filename}`,
            category: req.body.category || 'ambient'
        });

        const savedSound = await newSound.save();
        res.status(201).json(savedSound);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE sound
router.delete('/:id', async (req, res) => {
    try {
        const sound = await Sound.findById(req.id || req.params.id);
        if (!sound) return res.status(404).json({ message: 'Sonido no encontrado' });

        // Delete file
        const filePath = path.join(__dirname, '..', sound.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Sound.findByIdAndDelete(req.id || req.params.id);
        res.json({ message: 'Sonido eliminado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH update sound
router.patch('/:id', async (req, res) => {
    try {
        const updatedSound = await Sound.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updatedSound);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
