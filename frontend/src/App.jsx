import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Configure Axios backend connection base URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- SITE PASSWORD LOCK GATE ---
// Uses environment variable VITE_SITE_PASSWORD to lock access to the entire UI.
function PasswordGate({ children }) {
  const sitePassword = import.meta.env.VITE_SITE_PASSWORD;
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(() => {
    // If VITE_SITE_PASSWORD is not set, bypass lock
    if (!sitePassword) return true;
    return sessionStorage.getItem('site_authenticated') === 'true';
  });

  const handleUnlock = (e) => {
    e.preventDefault();
    if (input === sitePassword) {
      sessionStorage.setItem('site_authenticated', 'true');
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
    }
  };

  if (unlocked) {
    return children;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(44, 34, 28, 0.12)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
        animation: 'scaleIn 0.25s ease'
      }}>
        {/* Icon */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 22px',
          fontSize: 26
        }}>
          🔒
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
          Access Restricted
        </h2>
        <p style={{ margin: '0 0 26px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Enter the site password to access the Outreach platform.
        </p>
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter password..."
            style={{
              width: '100%',
              height: 44,
              padding: '0 16px',
              border: `1.5px solid ${error ? '#E05252' : 'var(--color-border-strong)'}`,
              borderRadius: 10,
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              textAlign: 'center',
              outline: 'none',
              letterSpacing: '0.1em',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = 'var(--color-accent)'; }}
            onBlur={e => { e.target.style.borderColor = error ? '#E05252' : 'var(--color-border-strong)'; }}
          />
          {error && (
            <p style={{ margin: 0, fontSize: 12, color: '#E05252', fontWeight: 600 }}>
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              height: 44,
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 3px 10px rgba(139, 158, 110, 0.3)',
              transition: 'background 0.15s ease, transform 0.1s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'none'}
          >
            Unlock Application
          </button>
        </form>
      </div>
    </div>
  );
}



// Layout & Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Campaigns from './pages/Campaigns';
import SentLog from './pages/SentLog';
import Replies from './pages/Replies';
import Settings from './pages/Settings';
import Testing from './pages/Testing';

export default function App() {
  return (
    <Router>
      <PasswordGate>
        <Layout>
          <Routes>
            {/* Main dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Management pages */}
            <Route path="/leads" element={<Leads />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/sent" element={<SentLog />} />
            <Route path="/replies" element={<Replies />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/testing" element={<Testing />} />

            {/* Catch-all redirects back to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PasswordGate>
    </Router>
  );
}
