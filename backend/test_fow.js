require('dotenv').config();
const mongoose = require('mongoose');
const Map = require('./models/Map');

async function testFOW() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get first map
        const maps = await Map.find();
        console.log(`Found ${maps.length} maps`);

        if (maps.length === 0) {
            console.log('No maps to test');
            process.exit(0);
        }

        const testMap = maps[0];
        console.log('Testing with map:', testMap.name, testMap._id);

        // Try to update FOW
        const testAction = {
            tool: 'brush',
            points: [100, 100, 150, 150],
            size: 50,
            id: Date.now().toString()
        };

        testMap.fowInfo = [...(testMap.fowInfo || []), testAction];
        await testMap.save();

        console.log('FOW update successful!');
        console.log('Current FOW actions:', testMap.fowInfo.length);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testFOW();
