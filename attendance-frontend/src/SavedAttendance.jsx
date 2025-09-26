import React, { useState, useEffect } from "react";
import Popup from "./Popup";

const API_URL = "https://attendance-helper.onrender.com";

function SavedAttendance({ refreshList }) {
  const [savedData, setSavedData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchSavedData();
  }, []);

  const fetchSavedData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSavedData(data.map((d) => ({ ...d, id: d.id || d._id })));
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleUpdate = async (updatedRecord) => {
    try {
      const token = localStorage.getItem("token");
      const id = updatedRecord.id || updatedRecord._id;
      const payload = { ...updatedRecord };
      delete payload.id;
      delete payload._id;

      await fetch(`${API_URL}/attendance/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      setSelectedRecord(null);
      fetchSavedData();
      if (refreshList) refreshList();
    } catch (error) {
      console.error("Failed to update record:", error);
    }
  };

  const handleDelete = async (idParam) => {
    const id =
      idParam || (selectedRecord && (selectedRecord.id || selectedRecord._id));
    if (!id) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/attendance/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedRecord(null);
      fetchSavedData();
      if (refreshList) refreshList();
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  };

  return (
    <div className="saved-data">
      <h2>Saved Attendance Records</h2>
      <ul>
        {savedData.length > 0 ? (
          savedData.map((record) => {
            const percentage = record.current_attendance_percentage || 0;
            let textColor = "red";
            if (percentage >= 85) textColor = "green";
            else if (percentage >= 75) textColor = "orange";

            return (
              <li
                key={record.id}
                className="saved-record-item"
                onClick={() => setSelectedRecord(record)}
                style={{ cursor: "pointer" }}
              >
                <span>
                  <strong>{record.name}</strong>
                </span>
                <span style={{ color: textColor }}>
                  {percentage.toFixed(2)}%
                </span>
              </li>
            );
          })
        ) : (
          <li>No saved records</li>
        )}
      </ul>

      {selectedRecord && (
        <Popup
          data={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isNewRecord={false}
        />
      )}
    </div>
  );
}

export default SavedAttendance;
