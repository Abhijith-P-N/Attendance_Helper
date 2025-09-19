require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// --- MongoDB connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Atlas connected successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// --- Attendance Schema ---
const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // link to user
  name: { type: String, default: 'Unnamed Record' },
  total_classes: { type: Number, required: true },
  leaves_taken: { type: Number, required: true },
  classes_attended: Number,
  current_attendance_percentage: Number,
  neededFor75: mongoose.Schema.Types.Mixed,
  neededFor85: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// --- User Schema ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, 
  email: { type: String, required: true, unique: true },    
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// --- Auth Middleware ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = user;
    next();
  });
};

// --- Helper Function ---
const calculateNeededClasses = (total, attended, target) => {
  if (total > 0 && (attended / total) * 100 >= target) return 0;
  if (100 - target === 0) return "Not possible to reach 100% with leaves.";
  const needed = (total * target - 100 * attended) / (100 - target);
  return Math.ceil(needed);
};

// --- Auth Routes ---
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashed });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }]
  });

  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// --- Attendance Routes (protected) ---
app.post('/calculate', authMiddleware, async (req, res) => {
  try {
    let { total_classes, leaves_taken, name } = req.body;
    total_classes = Number(total_classes);
    leaves_taken = Number(leaves_taken);

    if (isNaN(total_classes) || isNaN(leaves_taken)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const attended = total_classes - leaves_taken;
    const percentage = total_classes > 0 ? (attended / total_classes) * 100 : 0;

    const recordData = {
      user: req.user.id, // link record to logged-in user
      name: name || 'Unnamed Record',
      total_classes,
      leaves_taken,
      classes_attended: attended,
      current_attendance_percentage: percentage,
      neededFor75: calculateNeededClasses(total_classes, attended, 75),
      neededFor85: calculateNeededClasses(total_classes, attended, 85),
    };

    const newRecord = new Attendance(recordData);
    await newRecord.save();
    res.status(201).json(newRecord.toObject({ virtuals: true }));
  } catch (err) {
    console.error('Error in /calculate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/data', authMiddleware, async (req, res) => {
  try {
    const allData = await Attendance.find({ user: req.user.id }); // only user-specific
    res.json(allData.map(doc => doc.toObject({ virtuals: true })));
  } catch (err) {
    console.error('Error in GET /data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/data/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  let updated = { ...req.body };

  delete updated._id;
  delete updated.id;

  updated.total_classes = Number(updated.total_classes) || 0;
  updated.leaves_taken = Number(updated.leaves_taken) || 0;
  updated.classes_attended = updated.total_classes - updated.leaves_taken;
  updated.current_attendance_percentage =
    updated.total_classes > 0 ? (updated.classes_attended / updated.total_classes) * 100 : 0;
  updated.neededFor75 = calculateNeededClasses(updated.total_classes, updated.classes_attended, 75);
  updated.neededFor85 = calculateNeededClasses(updated.total_classes, updated.classes_attended, 85);

  try {
    const record = await Attendance.findOneAndUpdate(
      { _id: id, user: req.user.id }, // ensure only owner can update
      updated,
      { new: true }
    );
    if (record) res.json(record.toObject({ virtuals: true }));
    else res.status(404).json({ error: 'Record not found' });
  } catch (err) {
    console.error('Error in PUT /data/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/data/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Attendance.findOneAndDelete({ _id: req.params.id, user: req.user.id }); // secure delete
    if (result) res.json({ message: 'Record deleted successfully' });
    else res.status(404).json({ error: 'Record not found' });
  } catch (err) {
    console.error('Error in DELETE /data/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Start Server ---
connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
});
