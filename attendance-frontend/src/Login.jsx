import React, { useState } from 'react';
const API_URL = 'http://localhost:5000';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const body = isRegister
        ? { username, email, password }          // send username on register
        : { usernameOrEmail: email, password }; // login uses username/email

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok && !isRegister) {
        localStorage.setItem('token', data.token);
        onLogin();
      } else if (response.ok && isRegister) {
        alert('Registered successfully! Please login.');
        setIsRegister(false);
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch {
      alert('Server error');
    }
  };

  return (
    <div className="login-container">
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
      </form>
      <p
        onClick={() => setIsRegister(!isRegister)}
        style={{ cursor: 'pointer', color: 'blue' }}
      >
        {isRegister ? "Already have an account? Login" : "No account? Register"}
      </p>
    </div>
  );
}

export default Login;
