const mongoose = require('mongoose');

const SoundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['ambient', 'sfx'],
        default: 'ambient'
    },
    type: {
        type: String,
        default: 'audio'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Sound', SoundSchema);
