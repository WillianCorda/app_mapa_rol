const mongoose = require('mongoose');

const MapSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
  },
  url: {
    type: String,
    required: true,
  },
  // We store the drawing actions to reconstruct the layer
  // Actions: { type: 'brush' | 'eraser' | 'fill' | 'clear', points: number[], size: number, ... }
  fowInfo: {
      type: Array, // or a more specific schema if strictly needed, but Mixed/Array is flexible for JSON drawing data
      default: []
  },
  isActive: {
      type: Boolean,
      default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Map', MapSchema);
