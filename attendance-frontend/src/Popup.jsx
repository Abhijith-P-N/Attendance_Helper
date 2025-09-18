import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = ({ data, onSave, onUpdate, onDelete, onClose, isNewRecord }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [editTotal, setEditTotal] = useState(data.total_classes);
  const [editLeaves, setEditLeaves] = useState(data.leaves_taken);

  useEffect(() => {
    setEditName(data.name);
    setEditTotal(data.total_classes);
    setEditLeaves(data.leaves_taken);
    setIsEditing(false);
  }, [data]);

  const handleEditSave = () => {
    const newAttended = editTotal - editLeaves;
    const newPercentage = editTotal > 0 ? (newAttended / editTotal) * 100 : 0;
    const newNeeded75 = calculateNeededClasses(editTotal, newAttended, 75);
    const newNeeded85 = calculateNeededClasses(editTotal, newAttended, 85);

    const updatedRecord = {
      ...data,
      name: editName,
      total_classes: parseInt(editTotal),
      leaves_taken: parseInt(editLeaves),
      classes_attended: newAttended,
      current_attendance_percentage: newPercentage,
      neededFor75: newNeeded75,
      neededFor85: newNeeded85,
    };

    onUpdate(updatedRecord);
    setIsEditing(false);
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

  const attendancePercentage = Number(data.current_attendance_percentage || 0);

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h2>{isNewRecord ? "Calculation Results" : "Record Details"}</h2>
        <div className="pie-chart-container">
          <div
            className="pie-chart"
            style={{ '--percentage': `${attendancePercentage}%` }}
          >
            <span className="chart-label">{attendancePercentage.toFixed(1)}%</span>
          </div>
        </div>

        {isEditing ? (
          <div className="edit-form">
            <label>Name: <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
            <label>Total Classes: <input type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} /></label>
            <label>Leaves Taken: <input type="number" value={editLeaves} onChange={(e) => setEditLeaves(e.target.value)} /></label>
            <button onClick={handleEditSave} className="save-btn">Save Changes</button>
          </div>
        ) : (
          <div className="result-details">
            <p><strong>Subject:</strong> {data.name}</p>
            <p><strong>Total Classes:</strong> {data.total_classes}</p>
            <p><strong>Leaves Taken:</strong> {data.leaves_taken}</p>
            <p><strong>Classes Attended:</strong> {data.classes_attended}</p>
            <p><strong>Current Attendance:</strong> {attendancePercentage.toFixed(2)}%</p>
            {attendancePercentage < 75 && (
              <p className="needed-classes"><strong>Needed for 75%:</strong> {data.neededFor75}</p>
            )}
            {attendancePercentage < 85 && (
              <p className="needed-classes"><strong>Needed for 85%:</strong> {data.neededFor85}</p>
            )}
          </div>
        )}

        <div className="popup-actions">
          {isNewRecord ? (
            <button onClick={() => onSave(data)} className="save-btn">Save Record</button>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="edit-btn">Edit</button>
              <button onClick={() => onDelete(data._id || data.id)} className="delete-btn">Delete</button>
            </>
          )}
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
