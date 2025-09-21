import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Calculator() {
  const [totalClasses, setTotalClasses] = useState("");
  const [leavesTaken, setLeavesTaken] = useState("");
  const [attendancePercentage, setAttendancePercentage] = useState("");
  const [calculationMode, setCalculationMode] = useState("normal");
  const [result, setResult] = useState(null);

  const navigate = useNavigate();

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
        if (isNaN(leaves) || isNaN(percentage)) {
          alert("Please enter valid numbers.");
          return;
        }
        total = Math.ceil((100 * leaves) / (100 - percentage));
        attended = total - leaves;
        break;

      case "find_leaves":
        total = parseInt(totalClasses);
        percentage = parseFloat(attendancePercentage);
        if (isNaN(total) || isNaN(percentage)) {
          alert("Please enter valid numbers.");
          return;
        }
        attended = (total * percentage) / 100;
        leaves = total - attended;
        break;

      case "normal":
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

    setResult({
      total_classes: Math.round(total),
      leaves_taken: Math.round(leaves),
      classes_attended: Math.round(attended),
      current_attendance_percentage: percentage.toFixed(2),
      neededFor75,
      neededFor85,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ padding: "20px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Calculator</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/login")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Login
        </motion.button>
      </div>

      <motion.form
        onSubmit={handleCalculate}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="calculation-mode">
          <label>
            <input
              type="radio"
              value="normal"
              checked={calculationMode === "normal"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />
            Find Percentage
          </label>
          <label>
            <input
              type="radio"
              value="find_total_classes"
              checked={calculationMode === "find_total_classes"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />
            Find Total Classes
          </label>
          <label>
            <input
              type="radio"
              value="find_leaves"
              checked={calculationMode === "find_leaves"}
              onChange={(e) => setCalculationMode(e.target.value)}
            />
            Find Leaves
          </label>
        </div>

        {calculationMode !== "find_total_classes" && (
          <label>
            Total Classes Held:
            <input
              type="number"
              value={totalClasses}
              onChange={(e) => setTotalClasses(e.target.value)}
              required={calculationMode !== "find_total_classes"}
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
              required={calculationMode !== "find_leaves"}
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
              required={calculationMode !== "normal"}
              placeholder="e.g., 75"
            />
          </label>
        )}

        <button type="submit">Calculate</button>
      </motion.form>

      {result && (
        <motion.div
          className="results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p>Total Classes: {result.total_classes}</p>
          <p>Leaves Taken: {result.leaves_taken}</p>
          <p>Classes Attended: {result.classes_attended}</p>
          <p>Current Attendance: {result.current_attendance_percentage}%</p>
          <p>Classes Needed for 75%: {result.neededFor75}</p>
          <p>Classes Needed for 85%: {result.neededFor85}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

export default Calculator;
