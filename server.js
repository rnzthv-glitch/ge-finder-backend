const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const app = express();

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// 1. Database Connection
const MONGO_URI = "mongodb+srv://rnzthv_db_user:v6091IDpETsLXmag@techno.0llnfzm.mongodb.net/ge_finder?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 2. DATA MODELS

const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['client', 'engineer'], default: 'client' }
}));

const Engineer = mongoose.model('Engineer', new mongoose.Schema({
    name: String,
    location: String,
    email: String,
    contactNumber: String,
    rating: { type: Number, default: 5 },
    specialization: String,
    profilePic: { type: String, default: 'default-avatar.png' }
}));

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
        
        // Save the User
        const newUser = new User({ name, email, password: hashedPassword, role });
        const savedUser = await newUser.save();

        // If they are an engineer, create their profile document immediately
        if (role === 'engineer') {
            const newProfile = new Engineer({
                _id: savedUser._id, // Match the User ID so profile.html works instantly
                name: name,
                email: email,
                location: "Batangas", // Default location for your thesis
                specialization: "General",
                contactNumber: "Not Provided"
            });
            await newProfile.save();
        }

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

// 4. INQUIRY ROUTES

app.post('/api/inquiries', async (req, res) => {
    try {
        const newInquiry = new Inquiry(req.body);
        await newInquiry.save();
        res.status(201).json({ message: "Inquiry sent!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send inquiry" });
    }
});

app.get('/api/my-inquiries', async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ date: -1 });
        res.status(200).json(inquiries);
    } catch (err) {
        res.status(500).json({ error: "Database connection failed" });
    }
});

// 5. SEARCH & PROFILE ROUTES

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

// THE KEY FIX: Get specific engineer by ID
app.get('/api/engineers/:id', async (req, res) => {
    try {
        const engineer = await Engineer.findById(req.params.id);
        if (!engineer) {
            return res.status(404).json({ error: "Engineer profile not found" });
        }
        res.json(engineer);
    } catch (err) {
        res.status(500).json({ error: "Invalid Engineer ID" });
    }
});

// 6. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});