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
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// --- Attendance Schema ---
const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'Unnamed Record' },
  total_classes: { type: Number, required: true },
  leaves_taken: { type: Number, required: true },
  classes_attended: Number,
  current_attendance_percentage: Number,
  attendanceHistory: { type: Array, default: [] }, // {date, period, status, time}
  neededFor75: mongoose.Schema.Types.Mixed,
  neededFor85: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// --- User Schema ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  timetable: {
    type: Map,
    of: [String],
    default: {}
  }
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
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ error: 'Username or Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashed });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Timetable Routes ---
app.get('/timetable', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('timetable');
    res.json(user.timetable || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

app.put('/timetable', authMiddleware, async (req, res) => {
  try {
    const { timetable } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { timetable },
      { new: true }
    ).select('timetable');
    res.json(user.timetable);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save timetable' });
  }
});

app.delete('/timetable', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { timetable: {} },
      { new: true }
    ).select('timetable');
    res.json({ message: 'Timetable deleted', timetable: user.timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

// --- Attendance Routes ---
app.post('/calculate', authMiddleware, async (req, res) => {
  try {
    let { total_classes, leaves_taken, name } = req.body;
    total_classes = Number(total_classes);
    leaves_taken = Number(leaves_taken);
    if (isNaN(total_classes) || isNaN(leaves_taken)) return res.status(400).json({ error: 'Invalid input' });

    const attended = total_classes - leaves_taken;
    const percentage = total_classes > 0 ? (attended / total_classes) * 100 : 0;

    const recordData = {
      user: req.user.id,
      name: name || 'Unnamed Record',
      total_classes,
      leaves_taken,
      classes_attended: attended,
      current_attendance_percentage: percentage,
      neededFor75: calculateNeededClasses(total_classes, attended, 75),
      neededFor85: calculateNeededClasses(total_classes, attended, 85),
      attendanceHistory: []
    };

    const newRecord = new Attendance(recordData);
    await newRecord.save();
    res.status(201).json(newRecord.toObject({ virtuals: true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/data', authMiddleware, async (req, res) => {
  try {
    const allData = await Attendance.find({ user: req.user.id });
    res.json(allData.map(doc => doc.toObject({ virtuals: true })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Mark Attendance Endpoint (immutable once set) ---
app.post('/mark-attendance', authMiddleware, async (req, res) => {
  try {
    const { recordId, date, period, status } = req.body;
    const record = await Attendance.findOne({ _id: recordId, user: req.user.id });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const existing = record.attendanceHistory.find(e => e.date === date && e.period === period);
    if (existing) return res.status(400).json({ error: 'Attendance already marked for this period' });

    const now = new Date().toTimeString().split(' ')[0];
    record.attendanceHistory.push({ date, period, status, time: now });

    record.total_classes = (record.total_classes || 0) + 1;
    if (status === 'present') record.classes_attended = (record.classes_attended || 0) + 1;
    else record.leaves_taken = (record.leaves_taken || 0) + 1;

    record.current_attendance_percentage = record.total_classes > 0
      ? (record.classes_attended / record.total_classes) * 100
      : 0;

    record.neededFor75 = calculateNeededClasses(record.total_classes, record.classes_attended, 75);
    record.neededFor85 = calculateNeededClasses(record.total_classes, record.classes_attended, 85);

    await record.save();
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// --- Start server ---
connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
});
