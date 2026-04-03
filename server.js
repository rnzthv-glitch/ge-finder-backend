const express = require('express');
const cors = require('cors'); // Line 1
const app = express();
app.use(cors()); // Line 2
app.use(express.json());
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection
const MONGO_URI = "mongodb+srv://rnzthv_db_user:v6091IDpETsLXmag@techno.0llnfzm.mongodb.net/ge_finder?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.log("❌ Connection Error:", err));

// 2. Data Model
const Engineer = mongoose.model('Engineer', new mongoose.Schema({
    name: String,
    location: String,
    email: String,
    contactNumber: String,
    rating: { type: Number, default: 5 },
    specialization: String,
    profilePic: String
}));

// 3. Route for Search (All Engineers in a location)
app.get('/api/engineers', async (req, res) => {
    try {
        const { location } = req.query;
        const query = location ? { location: new RegExp(location, 'i') } : {};
        const engineers = await Engineer.find(query);
        res.json(engineers);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 4. Route for Single Profile (One specific Engineer)
app.get('/api/engineers/:id', async (req, res) => {
    try {
        const engineer = await Engineer.findById(req.params.id);
        if (!engineer) return res.status(404).json({ error: "Not found" });
        res.json(engineer);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID" });
    }
});

// 5. Start the Server
const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));