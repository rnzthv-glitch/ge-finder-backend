const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const app = express();

// --- MIDDLEWARE ---
app.use(cors()); // Allows your frontend to talk to this backend
app.use(express.json()); // Allows the server to read JSON data

// 1. Database Connection
const MONGO_URI = "mongodb+srv://rnzthv_db_user:v6091IDpETsLXmag@techno.0llnfzm.mongodb.net/ge_finder?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 2. DATA MODELS

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['client', 'engineer'], default: 'client' }
}));

// Engineer Profile Model
const Engineer = mongoose.model('Engineer', new mongoose.Schema({
    name: String,
    location: String,
    email: String,
    contactNumber: String,
    rating: { type: Number, default: 5 },
    specialization: String,
    profilePic: String
}));

// Inquiry Model (ADDED: This stores the messages from clients)
const Inquiry = mongoose.model('Inquiry', new mongoose.Schema({
    engineerId: String,
    clientName: String,
    location: String,
    lotSize: String,
    message: String,
    date: { type: Date, default: Date.now }
}));

// 3. AUTH ROUTES

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect password" });

        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            'GE_FINDER_SECRET_KEY_2026', 
            { expiresIn: '1d' }
        );

        res.json({ token, role: user.role, name: user.name });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// 4. INQUIRY ROUTES (The Bridge)

// Route to SEND an inquiry
app.post('/api/inquiries', async (req, res) => {
    try {
        const newInquiry = new Inquiry(req.body);
        await newInquiry.save();
        res.status(201).json({ message: "Inquiry sent!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send inquiry" });
    }
});

// Route for Engineers to SEE their inquiries
app.get('/api/my-inquiries', async (req, res) => {
    try {
        // For the thesis demo, we fetch all inquiries in the collection
        const inquiries = await Inquiry.find().sort({ date: -1 });
        res.status(200).json(inquiries);
    } catch (err) {
        res.status(500).json({ error: "Database connection failed" });
    }
});

// 5. SEARCH ROUTES
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

// 6. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// Get a specific engineer by ID
app.get('/api/engineers/:id', async (req, res) => {
    try {
        const engineer = await Engineer.findById(req.params.id);
        if (!engineer) {
            return res.status(404).json({ error: "Engineer not found" });
        }
        res.json(engineer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Invalid Engineer ID" });
    }
});