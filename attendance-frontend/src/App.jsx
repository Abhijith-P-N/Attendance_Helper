import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import AttendanceForm from './AttendanceForm';
import DailyManager from './DailyManager';
import SavedAttendance from './SavedAttendance';
import Calculator from './Calculator';
import Login from './Login';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <div className="container">
        
  {isLoggedIn ? (
    <>
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="nav-link">Calculator</Link>
        <Link to="/daily" className="nav-link">Daily Manager</Link>
        <Link to="/saved" className='nav-link'>Saved Attendance</Link>
      </div>
      <button onClick={handleLogout} className="logout-btn">Logout</button>
      </nav>
    </>
  ) : (
   <span></span>
  )}



        <Routes>
          {!isLoggedIn ? (
            <>
              <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
              <Route path="/Calculator" element={<Calculator />} />
              <Route path="*" element={<Navigate to="/Calculator" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<AttendanceForm />} />
              <Route path="/daily" element={<DailyManager />} />
              <Route path="/saved" element={<SavedAttendance />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
