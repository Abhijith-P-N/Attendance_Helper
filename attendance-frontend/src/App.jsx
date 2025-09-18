import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AttendanceForm from './AttendanceForm';
import DailyManager from './DailyManager';
import './App.css'; // Keep main styles here

function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <nav className="navbar">
          <Link to="/" className="nav-link">Calculator</Link>
          <Link to="/daily" className="nav-link">Daily Manager</Link>
        </nav>
        <Routes>
          <Route path="/" element={<AttendanceForm />} />
          <Route path="/daily" element={<DailyManager />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;