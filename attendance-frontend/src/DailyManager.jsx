import React, { useState, useEffect } from 'react';
import Popup from './Popup';

// API endpoint
const API_URL = 'https://attendance-helper.onrender.com';

function DailyManager() {
  const [savedData, setSavedData] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null); // record for popup
  const [isPopupVisible, setIsPopupVisible] = useState(false);

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
      total_classes: (recordToUpdate.total_classes || 0) + 1,
      leaves_taken: status === 'absent' ? (recordToUpdate.leaves_taken || 0) + 1 : (recordToUpdate.leaves_taken || 0),
    };

    const newAttended = updatedRecord.total_classes - updatedRecord.leaves_taken;
    updatedRecord.classes_attended = newAttended;
    updatedRecord.current_attendance_percentage = updatedRecord.total_classes > 0
      ? (newAttended / updatedRecord.total_classes) * 100
      : 0;
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

      if (response.ok) {
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
    if (total > 0 && (attended / total) * 100 >= target) return 0;
    if (100 - target === 0) return "Not possible to reach 100% with leaves.";
    const needed = (total * target - 100 * attended) / (100 - target);
    return Math.ceil(needed);
  };

  // --- New: open details popup ---
  const openRecordDetails = (record) => {
    setSelectedRecord(record);
    setIsPopupVisible(true);
  };

  // --- New: update handler for popup (PUT) ---
  const handleUpdate = async (updatedRecord) => {
    try {
      const id = updatedRecord.id || updatedRecord._id;
      if (!id) {
        console.error('No id provided for update');
        return;
      }

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
        alert('Failed to update record.');
      } else {
        await fetchSavedData();
        setIsPopupVisible(false);
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  // --- New: delete handler for popup (DELETE) ---
  const handleDelete = async (idParam) => {
    const id = idParam || (selectedRecord && (selectedRecord.id || selectedRecord._id));
    if (!id) {
      console.error('No id provided for delete');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/data/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        console.error('Failed to delete', await response.text());
        alert('Failed to delete record.');
      } else {
        await fetchSavedData();
        setIsPopupVisible(false);
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
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
              let textColor = "red";
              if (percentage >= 85) textColor = "green";
              else if (percentage >= 75) textColor = "orange";

              return (
                <li
                  key={record.id}
                  onClick={() => openRecordDetails(record)} // restored
                  className="saved-record-item"
                >
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

      {/* Render popup when user clicks a record */}
      {isPopupVisible && selectedRecord && (
        <Popup
          data={selectedRecord}
          onSave={() => { /* not used here, popup will call onUpdate instead */ }}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onClose={() => {
            setIsPopupVisible(false);
            setSelectedRecord(null);
          }}
          isNewRecord={false}
        />
      )}
    </>
  );
}

export default DailyManager;
