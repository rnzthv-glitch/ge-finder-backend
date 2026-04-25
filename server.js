const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection
const MONGO_URI = "mongodb+srv://rnzthv_db_user:v6091IDpETsLXmag@techno.0llnfzm.mongodb.net/ge_finder?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 2. Data Models

// User Model (For Clients and Engineers to Login)
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['client', 'engineer'], default: 'client' }
}));

// Engineer Profile Model (The data shown in search results)
const Engineer = mongoose.model('Engineer', new mongoose.Schema({
    name: String,
    location: String,
    email: String,
    contactNumber: String,
    rating: { type: Number, default: 5 },
    specialization: String,
    profilePic: String
}));

// 3. AUTH ROUTES (Registration & Login)

// Route: Register a new user
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        // Scramble the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed. Try again." });
    }
});

// Route: Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect password" });

        // Create a secure Token (Secret Key)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            'GE_FINDER_SECRET_KEY_2026', 
            { expiresIn: '1d' }
        );

        res.json({ 
            token, 
            role: user.role, 
            name: user.name,
            message: "Login successful!" 
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// 4. SEARCH ROUTES (Public Access)

// Get all engineers or filter by location
app.get('/api/engineers', async (req, res) => {
    try {
        const { location } = req.query;
        const query = location ? { location: new RegExp(location, 'i') } : {};
        const engineers = await Engineer.find(query);
        res.json(engineers);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch engineers" });
    }
});

// Get a specific engineer by ID
app.get('/api/engineers/:id', async (req, res) => {
    try {
        const engineer = await Engineer.findById(req.params.id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        res.json(engineer);
    } catch (err) {
        res.status(500).json({ error: "Invalid ID" });
    }
});

// 5. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});