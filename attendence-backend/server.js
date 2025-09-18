require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// The MongoDB Atlas connection string is now an environment variable
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// Function to connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Atlas connected successfully!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Define the Mongoose Schema and Model
const attendanceSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Unnamed Record'
  },
  total_classes: {
    type: Number,
    required: true
  },
  leaves_taken: {
    type: Number,
    required: true
  },
  classes_attended: {
    type: Number
  },
  current_attendance_percentage: {
    type: Number
  },
  neededFor75: {
    type: mongoose.Schema.Types.Mixed
  },
  neededFor85: {
    type: mongoose.Schema.Types.Mixed
  },
}, {
  timestamps: true
});

// Expose `id` virtual when converting to JSON/objects
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

/**
 * Calculates classes needed to reach a target percentage.
 * @param {number} total_classes
 * @param {number} classes_attended
 * @param {number} target_percentage
 */
const calculateNeededClasses = (total_classes, classes_attended, target_percentage) => {
  if (total_classes > 0 && (classes_attended / total_classes) * 100 >= target_percentage) {
    return 0;
  }
  if (100 - target_percentage === 0) {
    return "Not possible to reach 100% with leaves.";
  }
  const needed = (total_classes * target_percentage - 100 * classes_attended) / (100 - target_percentage);
  return Math.ceil(needed);
};

// POST endpoint to calculate and save attendance
app.post('/calculate', async (req, res) => {
  try {
    let { total_classes, leaves_taken, name } = req.body;

    total_classes = Number(total_classes);
    leaves_taken = Number(leaves_taken);

    if (isNaN(total_classes) || isNaN(leaves_taken)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const classes_attended = total_classes - leaves_taken;
    const current_attendance_percentage = total_classes > 0 ? (classes_attended / total_classes) * 100 : 0;

    const recordData = {
      name: name || 'Unnamed Record',
      total_classes,
      leaves_taken,
      classes_attended,
      current_attendance_percentage,
      neededFor75: calculateNeededClasses(total_classes, classes_attended, 75),
      neededFor85: calculateNeededClasses(total_classes, classes_attended, 85)
    };

    const newRecord = new Attendance(recordData);
    await newRecord.save();

    // Return object with virtuals (including `id`)
    res.status(201).json(newRecord.toObject({ virtuals: true }));
  } catch (error) {
    console.error('Error in /calculate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to retrieve all saved data
app.get('/data', async (req, res) => {
  try {
    const allData = await Attendance.find();
    // Return plain objects that include `id`
    const normalized = allData.map(doc => doc.toObject({ virtuals: true }));
    res.status(200).json(normalized);
  } catch (error) {
    console.error('Error in /data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE endpoint to delete a record
app.delete('/data/:id', async (req, res) => {
  const { id } = req.params;

  // Check if the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const result = await Attendance.findByIdAndDelete(id);

    if (result) {
      res.status(200).json({ message: 'Record deleted successfully' });
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error('Error in /data/:id DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New PUT endpoint to update an existing record
app.put('/data/:id', async (req, res) => {
  const { id } = req.params;
  let updatedRecordData = { ...req.body };

  // Check if the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    // Remove any _id or id from the update payload (don't let client change _id)
    delete updatedRecordData._id;
    delete updatedRecordData.id;

    // Normalize numeric fields and recompute derived fields server-side for safety
    updatedRecordData.total_classes = Number(updatedRecordData.total_classes) || 0;
    updatedRecordData.leaves_taken = Number(updatedRecordData.leaves_taken) || 0;
    updatedRecordData.classes_attended = updatedRecordData.total_classes - updatedRecordData.leaves_taken;
    updatedRecordData.current_attendance_percentage =
      updatedRecordData.total_classes > 0 ? (updatedRecordData.classes_attended / updatedRecordData.total_classes) * 100 : 0;

    updatedRecordData.neededFor75 = calculateNeededClasses(
      updatedRecordData.total_classes,
      updatedRecordData.classes_attended,
      75
    );
    updatedRecordData.neededFor85 = calculateNeededClasses(
      updatedRecordData.total_classes,
      updatedRecordData.classes_attended,
      85
    );

    const record = await Attendance.findByIdAndUpdate(
      id,
      updatedRecordData,
      { new: true }
    );

    if (record) {
      res.status(200).json(record.toObject({ virtuals: true }));
    } else {
      res.status(404).json({ error: 'Record not found' });
    }
  } catch (error) {
    console.error('Error in /data/:id PUT:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server only after successfully connecting to the database
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
});
