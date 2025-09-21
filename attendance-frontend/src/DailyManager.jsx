import React, { useState, useEffect } from 'react';

const API_URL = 'https://attendance-helper.onrender.com';
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function DailyManager() {
  const [savedData, setSavedData] = useState([]);
  const [periodsPerDay, setPeriodsPerDay] = useState(6);
  const [timetable, setTimetable] = useState({});
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchSavedData();
    fetchTimetable();
  }, []);

  const fetchSavedData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/data`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSavedData(data.map(d => ({ ...d, id: d.id || d._id })));
    } catch (err) { console.error(err); }
  };

  const fetchTimetable = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/timetable`, { headers: { Authorization: `Bearer ${token}` } });
      const tt = await res.json();
      WEEKDAYS.forEach(day => { if (!tt[day]) tt[day] = Array(periodsPerDay).fill(null); });
      setTimetable(tt);
    } catch (err) {
      console.error(err);
      initializeEmptyTimetable();
    }
  };

  const initializeEmptyTimetable = () => {
    const tt = {};
    WEEKDAYS.forEach(day => tt[day] = Array(periodsPerDay).fill(null));
    setTimetable(tt);
  };

  const saveTimetable = async (tt) => {
    setTimetable(tt);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/timetable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timetable: tt })
      });
    } catch (err) { console.error(err); }
  };

  const deleteTimetable = async () => {
    if (window.confirm('Are you sure you want to delete the timetable?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/timetable`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        initializeEmptyTimetable();
        alert('Timetable deleted.');
      } catch (err) { console.error(err); alert('Failed to delete timetable'); }
    }
  };

  const handleSetPeriodSubject = (day, idx, subId) => {
    const newTT = { ...timetable };
    if (!newTT[day]) newTT[day] = Array(periodsPerDay).fill(null);
    newTT[day][idx] = subId;
    saveTimetable(newTT);
  };

  const handleMarkAttendance = async (subjectId, period) => {
    await markAttendance(subjectId, period, 'present');
  };

  const handleMarkAbsent = async (subjectId, period) => {
    await markAttendance(subjectId, period, 'absent');
  };

  const markAttendance = async (subjectId, period, status) => {
    if (!selectedDate) { alert('Select a date'); return; }
    const subject = savedData.find(s => s.id === subjectId);
    if (!subject) return;

    if (subject.attendanceHistory?.some(e => e.date === selectedDate && e.period === period)) {
      alert('Attendance already marked for this period');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/mark-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recordId: subjectId, date: selectedDate, period, status })
      });
      if (res.ok) fetchSavedData();
      else { const err = await res.json(); alert(err.error); }
    } catch (err) { console.error(err); }
  };

  const selectedWeekday = selectedDate ? WEEKDAYS[new Date(selectedDate + 'T00:00:00').getDay() - 1] : null;

  return (
    <>
      <h1>Timetable Attendance Manager</h1>
      <div style={{ marginBottom: '20px' }}>
        <label>
          Periods Per Day: 
          <input type="number" value={periodsPerDay} min={1} max={12} onChange={e => setPeriodsPerDay(Number(e.target.value))} />
        </label>
        <label style={{ marginLeft: '20px' }}>
          Select Date: 
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </label>
      </div>

      <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Day / Period</th>
            {Array.from({ length: periodsPerDay }, (_, i) => <th key={i}>Period {i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map(day =>
            <tr key={day}>
              <td><strong>{day}</strong></td>
              {Array.from({ length: periodsPerDay }, (_, idx) => {
                const subjectId = timetable[day]?.[idx];
                const subject = savedData.find(s => s.id === subjectId);
                const status = subject?.attendanceHistory?.find(e => e.date === selectedDate && e.period === idx)?.status;
                const isActive = selectedWeekday === day;
                return (
                  <td key={idx} style={{ textAlign: 'center' }}>
                    {subject ? (
                      <div>
                        <div>{subject.name}</div>
                        {isActive ? (
                          status ? 
                            <div style={{ color: status === 'present' ? 'green' : 'red', fontWeight: 'bold' }}>
                              {status.toUpperCase()}
                            </div>
                          : (
                            <>
                              <button onClick={() => handleMarkAttendance(subject.id, idx)}>Present</button>
                              <button onClick={() => handleMarkAbsent(subject.id, idx)}>Absent</button>
                            </>
                          )
                        ) : <small style={{ color: 'gray' }}>(No attendance)</small>}
                      </div>
                    ) : (
                      <select value="" onChange={e => handleSetPeriodSubject(day, idx, e.target.value)}>
                        <option value="">Add Subject</option>
                        {savedData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '20px' }}>
        <button style={{ backgroundColor: 'red', color: 'white', padding: '10px' }} onClick={deleteTimetable}>
          Delete Timetable
        </button>
      </div>

      <hr />
      <h2>Attendance Records</h2>
      {savedData.map(subject => (
        <div key={subject.id}>
          <h3>{subject.name}</h3>
          <p>Total: {subject.total_classes || 0}, Attended: {subject.classes_attended || 0}, Absent: {subject.leaves_taken || 0}</p>
          <ul>
            {subject.attendanceHistory?.length > 0 ? subject.attendanceHistory.map((entry, idx) => (
              <li key={idx}>{entry.date} - Period {entry.period + 1} - {entry.status.toUpperCase()} at {entry.time}</li>
            )) : <li>No attendance yet.</li>}
          </ul>
        </div>
      ))}
    </>
  );
}

export default DailyManager;
