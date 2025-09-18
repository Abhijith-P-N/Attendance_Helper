import React, { useState, useEffect } from 'react';
import Popup from './Popup';

// Add this variable to manage your API endpoint
const API_URL = 'http://127.0.0.1:3000';

function AttendanceForm() {
  const [name, setName] = useState('');
  const [totalClasses, setTotalClasses] = useState('');
  const [leavesTaken, setLeavesTaken] = useState('');
  const [attendancePercentage, setAttendancePercentage] = useState('');
  const [calculationMode, setCalculationMode] = useState('normal');
  const [newCalculation, setNewCalculation] = useState(null);
  const [savedData, setSavedData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  useEffect(() => {
    fetchSavedData();
  }, []);

  const fetchSavedData = async () => {
    try {
      const response = await fetch(`${API_URL}/data`);
      const data = await response.json();

      // Normalize each record to ensure `id` exists (fallback to _id)
      const normalized = data.map((d) => ({ ...d, id: d.id || d._id }));
      setSavedData(normalized);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateNeededClasses = (total, attended, target) => {
    if (total > 0 && (attended / total) * 100 >= target) {
      return 0;
    }
    if (100 - target === 0) {
      return "Not possible to reach 100% with leaves.";
    }
    const needed = (total * target - 100 * attended) / (100 - target);
    return Math.ceil(needed);
  };

  const handleCalculate = (e) => {
    e.preventDefault();

    let total, leaves, attended, percentage;

    switch (calculationMode) {
      case 'find_total_classes':
        leaves = parseInt(leavesTaken);
        percentage = parseFloat(attendancePercentage);
        if (isNaN(leaves) || isNaN(percentage)) {
          alert("Please enter valid numbers.");
          return;
        }
        total = Math.ceil((100 * leaves) / (100 - percentage));
        attended = total - leaves;
        break;

      case 'find_leaves':
        total = parseInt(totalClasses);
        percentage = parseFloat(attendancePercentage);
        if (isNaN(total) || isNaN(percentage)) {
          alert("Please enter valid numbers.");
          return;
        }
        attended = (total * percentage) / 100;
        leaves = total - attended;
        break;

      case 'normal':
      default:
        total = parseInt(totalClasses);
        leaves = parseInt(leavesTaken);
        if (isNaN(total) || isNaN(leaves)) {
          alert("Please enter valid numbers.");
          return;
        }
        attended = total - leaves;
        percentage = total > 0 ? (attended / total) * 100 : 0;
        break;
    }

    const neededFor75 = calculateNeededClasses(total, attended, 75);
    const neededFor85 = calculateNeededClasses(total, attended, 85);

    setNewCalculation({
      name,
      total_classes: Math.round(total),
      leaves_taken: Math.round(leaves),
      classes_attended: Math.round(attended),
      current_attendance_percentage: percentage,
      neededFor75,
      neededFor85
    });
    setSelectedRecord(null);
    setIsPopupVisible(true);
  };

  const handleSave = async (recordToSave) => {
    try {
      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordToSave),
      });
      await response.json();
      await fetchSavedData();
      setIsPopupVisible(false);
      setNewCalculation(null);
      setName(''); setTotalClasses(''); setLeavesTaken(''); setAttendancePercentage('');
      setCalculationMode('normal');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data. Please ensure the backend is running.');
    }
  };

  const handleUpdate = async (updatedRecord) => {
    try {
      const id = updatedRecord.id || updatedRecord._id;
      if (!id) {
        console.error('No id provided for update');
        return;
      }

      // Prepare payload without id/_id
      const payload = { ...updatedRecord };
      delete payload.id;
      delete payload._id;

      const response = await fetch(`${API_URL}/data/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Update failed', await response.text());
      }

      await fetchSavedData();
      setIsPopupVisible(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  const handleDelete = async (idParam) => {
    // idParam could be id or _id
    const id = idParam || (selectedRecord && (selectedRecord.id || selectedRecord._id));
    if (!id) {
      console.error('No id provided for delete');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/data/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        console.error('Failed to delete', await response.text());
      }
      await fetchSavedData();
      setIsPopupVisible(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const openRecordDetails = (record) => {
    setSelectedRecord(record);
    setNewCalculation(null);
    setIsPopupVisible(true);
  };

  return (
    <>
      <h1>Attendance Helper</h1>
      <form onSubmit={handleCalculate}>
        <div className="calculation-mode">
          <label><input type="radio" value="normal" checked={calculationMode === 'normal'} onChange={(e) => setCalculationMode(e.target.value)} /> Find Percentage</label>
          <label><input type="radio" value="find_total_classes" checked={calculationMode === 'find_total_classes'} onChange={(e) => setCalculationMode(e.target.value)} /> Find Total Classes</label>
          <label><input type="radio" value="find_leaves" checked={calculationMode === 'find_leaves'} onChange={(e) => setCalculationMode(e.target.value)} /> Find Leaves</label>
        </div>
        <label>Subject Name:<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Maths" required /></label>
        {calculationMode !== 'find_total_classes' && (<label>Total Classes Held:<input type="number" value={totalClasses} onChange={(e) => setTotalClasses(e.target.value)} required /></label>)}
        {calculationMode !== 'find_leaves' && (<label>Leaves Taken:<input type="number" value={leavesTaken} onChange={(e) => setLeavesTaken(e.target.value)} required /></label>)}
        {calculationMode !== 'normal' && (<label>Current Attendance Percentage:<input type="number" value={attendancePercentage} onChange={(e) => setAttendancePercentage(e.target.value)} required placeholder="e.g., 75" /></label>)}
        <button type="submit">Calculate</button>
      </form>
      <hr />
      <div className="saved-data">
        <h2>Saved Attendance Records</h2>
        <ul>
          {savedData.length > 0 ? (
            savedData.map((record) => (
              <li key={record.id} onClick={() => openRecordDetails(record)} className="saved-record-item">
                <span className="record-name"><strong>{record.name}</strong></span>
                <span className="record-percentage">{(record.current_attendance_percentage || 0).toFixed(2)}%</span>
              </li>
            ))
          ) : (
            <li key="no-data">No data saved yet.</li>
          )}
        </ul>
      </div>
      {isPopupVisible && (newCalculation || selectedRecord) && (
        <Popup 
          data={newCalculation || selectedRecord} 
          onSave={handleSave} 
          onDelete={handleDelete} 
          onUpdate={handleUpdate} 
          onClose={() => setIsPopupVisible(false)} 
          isNewRecord={!!newCalculation} 
        />
      )}
    </>
  );
}

export default AttendanceForm;
