import React, { useState } from "react";
import Popup from "./Popup";

const API_URL = "http://localhost:5000"; // adjust as needed

function AttendanceForm() {
  const [name, setName] = useState("");
  const [totalClasses, setTotalClasses] = useState("");
  const [leavesTaken, setLeavesTaken] = useState("");
  const [attendancePercentage, setAttendancePercentage] = useState("");
  const [calculationMode, setCalculationMode] = useState("normal");
  const [newCalculation, setNewCalculation] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [message, setMessage] = useState("");

  const calculateNeededClasses = (total, attended, target) => {
    if (total > 0 && (attended / total) * 100 >= target) return 0;
    if (100 - target === 0) return "Not possible to reach 100% with leaves.";
    const needed = (total * target - 100 * attended) / (100 - target);
    return Math.ceil(needed);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    let total, leaves, attended, percentage;

    switch (calculationMode) {
      case "find_total_classes":
        leaves = parseInt(leavesTaken);
        percentage = parseFloat(attendancePercentage);
        total = Math.ceil((100 * leaves) / (100 - percentage));
        attended = total - leaves;
        break;
      case "find_leaves":
        total = parseInt(totalClasses);
        percentage = parseFloat(attendancePercentage);
        attended = (total * percentage) / 100;
        leaves = total - attended;
        break;
      default:
        total = parseInt(totalClasses);
        leaves = parseInt(leavesTaken);
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
      neededFor85,
    });
    setIsPopupVisible(true);
    setMessage("");
  };

  const handleSave = async (record) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(record),
      });

      setIsPopupVisible(false);
      setNewCalculation(null);
      setName("");
      setTotalClasses("");
      setLeavesTaken("");
      setAttendancePercentage("");
      setMessage("Record created successfully!");
    } catch (error) {
      console.error("Failed to save record", error);
      alert("Failed to save record.");
    }
  };

  return (
    <>
      <h1>Attendance Helper</h1>
      <form onSubmit={handleCalculate}>
        <div className="calculation-mode">
          <label>
            <input
              type="radio"
              value="normal"
              checked={calculationMode === "normal"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />{" "}
            Find Percentage
          </label>
          <label>
            <input
              type="radio"
              value="find_total_classes"
              checked={calculationMode === "find_total_classes"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />{" "}
            Find Total Classes
          </label>
          <label>
            <input
              type="radio"
              value="find_leaves"
              checked={calculationMode === "find_leaves"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />{" "}
            Find Leaves
          </label>
        </div>

        <label>
          Subject Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Maths"
            required
          />
        </label>

        {calculationMode !== "find_total_classes" && (
          <label>
            Total Classes Held:
            <input
              type="number"
              value={totalClasses}
              onChange={(e) => setTotalClasses(e.target.value)}
              required
            />
          </label>
        )}

        {calculationMode !== "find_leaves" && (
          <label>
            Leaves Taken:
            <input
              type="number"
              value={leavesTaken}
              onChange={(e) => setLeavesTaken(e.target.value)}
              required
            />
          </label>
        )}

        {calculationMode !== "normal" && (
          <label>
            Current Attendance Percentage:
            <input
              type="number"
              value={attendancePercentage}
              onChange={(e) => setAttendancePercentage(e.target.value)}
              required
              placeholder="e.g., 75"
            />
          </label>
        )}

        <button type="submit">Calculate</button>
      </form>

      {message && <p style={{ color: "green", fontWeight: "bold" }}>{message}</p>}

      {isPopupVisible && newCalculation && (
        <Popup
          data={newCalculation}
          onClose={() => setIsPopupVisible(false)}
          onSave={handleSave}
          isNewRecord={true}
        />
      )}
    </>
  );
}

export default AttendanceForm;
