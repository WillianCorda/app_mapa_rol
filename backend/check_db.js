const mongoose = require('mongoose');
const Map = require('./models/Map');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const active = await Map.findOne({ isActive: true });
        console.log("Active Map:", active ? active.name : "None");
        const all = await Map.find();
        console.log("Total Maps:", all.length);
        all.forEach(m => console.log(`- ${m.name} (Active: ${m.isActive})`));
        process.exit();
    })
    .catch(e => console.error(e));
