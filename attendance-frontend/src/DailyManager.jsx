import React, { useState, useEffect } from 'react';

// Add this variable to manage your API endpoint
const API_URL = 'https://attendance-helper.onrender.com';

function DailyManager() {
  const [savedData, setSavedData] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  useEffect(() => {
    fetchSavedData();
  }, []);

  useEffect(() => {
    if (savedData.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(savedData[0].id);
    }
  }, [savedData, selectedSubjectId]);

  const fetchSavedData = async () => {
    try {
      const response = await fetch(`${API_URL}/data`);
      const data = await response.json();
      const normalized = data.map(d => ({ ...d, id: d.id || d._id }));
      setSavedData(normalized);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  const handleDailyUpdate = async (status) => {
    if (!selectedSubjectId) {
      alert('Please select a subject to update.');
      return;
    }
    
    const recordToUpdate = savedData.find(record => record.id === selectedSubjectId);
    if (!recordToUpdate) return;

    const updatedRecord = {
      ...recordToUpdate,
      total_classes: recordToUpdate.total_classes + 1,
      leaves_taken: status === 'absent' ? recordToUpdate.leaves_taken + 1 : recordToUpdate.leaves_taken,
    };

    const newAttended = updatedRecord.total_classes - updatedRecord.leaves_taken;
    updatedRecord.classes_attended = newAttended;
    updatedRecord.current_attendance_percentage = (newAttended / updatedRecord.total_classes) * 100;
    updatedRecord.neededFor75 = calculateNeededClasses(updatedRecord.total_classes, newAttended, 75);
    updatedRecord.neededFor85 = calculateNeededClasses(updatedRecord.total_classes, newAttended, 85);

    try {
      const payload = { ...updatedRecord };
      delete payload.id;
      delete payload._id;

      const response = await fetch(`${API_URL}/data/${updatedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if(response.ok) {
        await fetchSavedData();
        alert(`${recordToUpdate.name} attendance updated successfully.`);
      } else {
        console.error('Failed to update record', await response.text());
        alert('Failed to update attendance.');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Failed to update attendance.');
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

  return (
    <>
      <h1>Daily Attendance Manager</h1>
      <div className="daily-manager">
        <label>
          Select Subject:
          <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
            {savedData.length > 0 ? (
              savedData.map(record => (
                <option key={record.id} value={record.id}>{record.name}</option>
              ))
            ) : (
              <option value="">No subjects available</option>
            )}
          </select>
        </label>
        <div className="daily-actions">
          <button className="present-btn" onClick={() => handleDailyUpdate('present')}>Mark as Present</button>
          <button className="absent-btn" onClick={() => handleDailyUpdate('absent')}>Mark as Absent</button>
        </div>
      </div>
      <hr />
      <div className="saved-data">
        <h2>Current Records</h2>
        <ul>
          {savedData.length > 0 ? (
            savedData.map((record) => {
              const percentage = record.current_attendance_percentage || 0;

              // Decide text color only for percentage
              let textColor = "red"; // <75%
              if (percentage >= 85) {
                textColor = "green"; // >=85%
              } else if (percentage >= 75) {
                textColor = "orange"; // 75–84%
              }

              return (
                <li key={record.id} className="saved-record-item">
                  <span className="record-name"><strong>{record.name}</strong></span>
                  <span className="record-percentage" style={{ color: textColor }}>
                    {percentage.toFixed(2)}%
                  </span>
                </li>
              );
            })
          ) : (
            <li key="no-data">No data saved yet.</li>
          )}
        </ul>
      </div>
    </>
  );
}

export default DailyManager;
