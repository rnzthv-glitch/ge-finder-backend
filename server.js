const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// 1. DATABASE CONNECTION
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
    clientEmail: String,
    location: String,
    lotSize: String,
    // This MUST be an array to support back-and-forth
    messages: [{
        sender: { type: String, enum: ['client', 'engineer'] },
        text: String,
        date: { type: Date, default: Date.now }
    }],
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
        const savedUser = await newUser.save();

        if (role === 'engineer') {
            const newProfile = new Engineer({
                _id: savedUser._id, 
                name: name,
                email: email,
                location: "San Pascual, Batangas", 
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


// PASTE THE NEW ROUTE HERE
app.get('/api/client-inquiries', async (req, res) => {
    try {
        const { name } = req.query; 
        if (!name) return res.status(400).json({ error: "Name is required" });
        
        const inquiries = await Inquiry.find({ clientName: name }).sort({ date: -1 });
        res.json(inquiries);
    } catch (err) {
        res.status(500).json({ error: "Server error fetching inquiries" });
    }
});

// NEW: Application Model
const Application = mongoose.model('Application', new mongoose.Schema({
    role: String,
    fullName: String,
    email: String,
    licenseNumber: String,
    contactNumber: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
}));

// NEW: Handle Form Submissions
app.post('/api/applications', async (req, res) => {
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ message: "Application submitted successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit application." });
    }
});

// KEEP THIS AT THE VERY BOTTOM
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// 4. INQUIRY & REPLY ROUTES

app.post('/api/inquiries', async (req, res) => {
    try {
        const { engineerId, clientName, clientEmail, location, lotSize, message } = req.body;
        
        const newInquiry = new Inquiry({
            engineerId,
            clientName,
            clientEmail,
            location,
            lotSize,
            // Initialize the chat with the client's first message
            messages: [{
                sender: 'client',
                text: message
            }]
        });

        await newInquiry.save();
        res.status(201).json({ message: "Inquiry sent!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send inquiry" });
    }
});

app.put('/api/inquiries/:id/message', async (req, res) => {
    try {
        const { sender, text } = req.body;
        const updatedInquiry = await Inquiry.findByIdAndUpdate(
            req.params.id,
            { $push: { messages: { sender, text } } }, // Pushes new chat bubble to the array
            { new: true }
        );
        res.json(updatedInquiry);
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
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

app.get('/api/engineers/:id', async (req, res) => {
    try {
        const engineer = await Engineer.findById(req.params.id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        res.json(engineer);
    } catch (err) {
        res.status(500).json({ error: "Invalid Engineer ID" });
    }
});


