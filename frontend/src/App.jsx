import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Configure Axios backend connection base URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

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

// --- OPTIONAL VERCEL PREVIEW MOCK MODE ---
// If VITE_API_URL is not set, we intercept all axios calls and simulate a fully-functioning database in memory!
const isMockMode = !import.meta.env.VITE_API_URL;

if (isMockMode) {
  console.log('⚠️ Running in MOCK MODE (VITE_API_URL is not set). Backend requests are simulated in memory.');
  
  let mockLeads = [
    { id: 1, email: 'john@company.com', name: 'John Smith', company: 'Acme Corp', source: 'upload', status: 'replied', created_at: '2026-06-01T12:00:00Z' },
    { id: 2, email: 'sarah@design.io', name: 'Sarah Connor', company: 'Design.io', source: 'sheet', status: 'queued', created_at: '2026-06-02T14:30:00Z' },
    { id: 3, email: 'david@venture.vc', name: 'David Lee', company: 'Venture Capital', source: 'manual', status: 'sent', created_at: '2026-06-03T09:15:00Z' },
    { id: 4, email: 'emma@tech.com', name: 'Emma Watson', company: 'Tech Inc', source: 'sheet', status: 'pending', created_at: '2026-06-04T18:45:00Z' },
    { id: 5, email: 'bounced-user@domain.com', name: 'James B.', company: 'Legacy Inc', source: 'upload', status: 'bounced', created_at: '2026-06-05T10:00:00Z' }
  ];
  
  let mockCampaigns = [
    { id: 1, name: 'Q2 Partnership Outreach', subject: 'Collaboration question for {{company}}', body_template: 'Hi {{name}},\n\nI love what you are building at {{company}}...', status: 'running', delay_min: 60, delay_max: 180, daily_limit: 40, emails_sent: 25 },
    { id: 2, name: 'Beta Program Feedback', subject: 'Quick question about your feedback', body_template: 'Hi {{name}},\n\nThanks for trying out our beta...', status: 'draft', delay_min: 30, delay_max: 90, daily_limit: 100, emails_sent: 0 }
  ];

  let mockSent = [
    { id: 1, to_email: 'david@venture.vc', subject: 'Collaboration question for Venture Capital', campaign_name: 'Q2 Partnership Outreach', sent_at: '2026-06-05T08:00:00Z', status: 'sent' },
    { id: 2, to_email: 'john@company.com', subject: 'Collaboration question for Acme Corp', campaign_name: 'Q2 Partnership Outreach', sent_at: '2026-06-05T07:30:00Z', status: 'replied' }
  ];

  let mockReplies = [
    { id: 1, sent_email_id: 2, from_email: 'john@company.com', subject: 'Re: Collaboration question for Acme Corp', snippet: 'Hi, thanks for reaching out. I would be open to scheduling a quick call next Tuesday.', received_at: '2026-06-05T07:45:00Z', discord_notified: 1, actioned: 0, campaign_name: 'Q2 Partnership Outreach' }
  ];

  let mockSettings = {
    GMAIL_USER: 'foreignaffairsllc2017@gmail.com',
    GMAIL_APP_PASSWORD: '4q23 a2f5 u5vp q6pu p4u2 3sac hoxo jmnx',
    DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/...',
    WARMUP_EMAILS: 'foreignaffairsllc2017@gmail.com',
    WARMUP_ENABLED: 'true',
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/12345/edit',
    GOOGLE_SERVICE_ACCOUNT_JSON: './service-account.json'
  };

  axios.interceptors.request.use((config) => {
    config.adapter = async (cfg) => {
      const url = cfg.url;
      const method = cfg.method.toLowerCase();
      let data = null;

      await new Promise(r => setTimeout(r, 200));

      if (url.startsWith('/api/stats')) {
        data = {
          totalLeads: mockLeads.length,
          activeCampaigns: mockCampaigns.filter(c => c.status === 'running').length,
          emailsSent: mockSent.length,
          responseRate: mockSent.length > 0 ? Math.round((mockReplies.length / mockSent.length) * 100) : 0,
          warmupActive: mockSettings.WARMUP_ENABLED === 'true',
          recentReplies: mockReplies,
          chartData: [
            { date: '2026-05-30', sends: 0 },
            { date: '2026-05-31', sends: 5 },
            { date: '2026-06-01', sends: 12 },
            { date: '2026-06-02', sends: 8 },
            { date: '2026-06-03', sends: 15 },
            { date: '2026-06-04', sends: 20 },
            { date: '2026-06-05', sends: mockSent.length }
          ]
        };
      } 
      
      else if (url === '/api/leads') {
        const { status, search } = cfg.params || {};
        let filtered = [...mockLeads];
        if (status) filtered = filtered.filter(l => l.status === status);
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(l => 
            l.email.toLowerCase().includes(s) || 
            (l.name && l.name.toLowerCase().includes(s)) ||
            (l.company && l.company.toLowerCase().includes(s))
          );
        }
        data = filtered;
      }
      
      else if (url.startsWith('/api/leads/import-csv')) {
        const newLead = {
          id: mockLeads.length + 1,
          email: `new-lead-${mockLeads.length + 1}@domain.com`,
          name: 'Imported CSV Lead',
          company: 'CSV Corp',
          source: 'upload',
          status: 'pending',
          created_at: new Date().toISOString()
        };
        mockLeads.push(newLead);
        data = { success: true, count: 1 };
      }

      else if (url.startsWith('/api/leads/sync-sheet')) {
        const newLead = {
          id: mockLeads.length + 1,
          email: `sheet-lead-${mockLeads.length + 1}@spreadsheets.com`,
          name: 'Google Sheet Contact',
          company: 'Spreadsheet Inc',
          source: 'sheet',
          status: 'pending',
          created_at: new Date().toISOString()
        };
        mockLeads.push(newLead);
        data = { success: true, count: 1 };
      }

      else if (url.startsWith('/api/leads/bulk-status')) {
        const body = JSON.parse(cfg.data);
        mockLeads = mockLeads.map(l => body.ids.includes(l.id) ? { ...l, status: body.status } : l);
        data = { success: true, count: body.ids.length };
      }

      else if (url.startsWith('/api/leads/bulk-delete')) {
        const body = JSON.parse(cfg.data);
        mockLeads = mockLeads.filter(l => !body.ids.includes(l.id));
        data = { success: true, count: body.ids.length };
      }

      else if (url.match(/^\/api\/leads\/\d+\/status$/)) {
        const id = parseInt(url.split('/')[3]);
        const body = JSON.parse(cfg.data);
        mockLeads = mockLeads.map(l => l.id === id ? { ...l, status: body.status } : l);
        data = { success: true };
      }

      else if (url.match(/^\/api\/leads\/\d+$/) && method === 'delete') {
        const id = parseInt(url.split('/')[3]);
        mockLeads = mockLeads.filter(l => l.id !== id);
        data = { success: true };
      }

      else if (url === '/api/campaigns') {
        data = mockCampaigns.map(c => ({
          ...c,
          emails_sent: mockSent.filter(s => s.campaign_name === c.name).length
        }));
      }

      else if (url === '/api/campaigns' && method === 'post') {
        const body = JSON.parse(cfg.data);
        const newC = {
          id: mockCampaigns.length + 1,
          name: body.name,
          subject: body.subject,
          body_template: body.body_template,
          status: 'draft',
          delay_min: body.delay_min || 60,
          delay_max: body.delay_max || 180,
          daily_limit: body.daily_limit || 40,
          emails_sent: 0
        };
        mockCampaigns.push(newC);
        data = newC;
      }

      else if (url.match(/^\/api\/campaigns\/\d+$/) && method === 'put') {
        const id = parseInt(url.split('/')[3]);
        const body = JSON.parse(cfg.data);
        mockCampaigns = mockCampaigns.map(c => c.id === id ? { ...c, ...body } : c);
        data = mockCampaigns.find(c => c.id === id);
      }

      else if (url.match(/^\/api\/campaigns\/\d+\/(start|pause|stop)$/) && method === 'post') {
        const parts = url.split('/');
        const id = parseInt(parts[3]);
        const action = parts[4];
        const statusMap = { start: 'running', pause: 'paused', stop: 'done' };
        mockCampaigns = mockCampaigns.map(c => c.id === id ? { ...c, status: statusMap[action] } : c);
        data = { success: true, status: statusMap[action] };
      }

      else if (url.match(/^\/api\/campaigns\/\d+$/) && method === 'delete') {
        const id = parseInt(url.split('/')[3]);
        mockCampaigns = mockCampaigns.filter(c => c.id !== id);
        data = { success: true };
      }

      else if (url === '/api/sent') {
        data = mockSent;
      }

      else if (url === '/api/replies') {
        data = mockReplies;
      }

      else if (url.match(/^\/api\/replies\/\d+\/actioned$/) && method === 'patch') {
        const id = parseInt(url.split('/')[3]);
        const body = JSON.parse(cfg.data);
        mockReplies = mockReplies.map(r => r.id === id ? { ...r, actioned: body.actioned } : r);
        data = { success: true };
      }

      else if (url.match(/^\/api\/replies\/\d+\/notify$/) && method === 'post') {
        data = { success: true };
      }

      else if (url === '/api/settings' && method === 'get') {
        data = mockSettings;
      }

      else if (url === '/api/settings' && method === 'post') {
        const body = JSON.parse(cfg.data);
        mockSettings = { ...mockSettings, ...body };
        data = { success: true };
      }

      else if (url === '/api/settings/test-discord') {
        data = { success: true };
      }

      else if (url === '/api/settings/reset-database') {
        const body = JSON.parse(cfg.data);
        if (body.action === 'clear_logs') {
          mockSent = [];
          mockReplies = [];
          data = { success: true, message: 'Mock sent logs and replies cleared.' };
        } else if (body.action === 'reset_leads') {
          mockLeads = mockLeads.map(l => ({ ...l, status: 'pending' }));
          data = { success: true, message: 'Mock leads reset to pending.' };
        }
      }

      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg
      };
    };
    return config;
  });
}

// Layout & Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Campaigns from './pages/Campaigns';
import SentLog from './pages/SentLog';
import Replies from './pages/Replies';
import Settings from './pages/Settings';

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

            {/* Catch-all redirects back to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PasswordGate>
    </Router>
  );
}
