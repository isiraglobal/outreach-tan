import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  TrendingUp, Users, Mail, Target, Flame, ArrowRight, MessageSquare, AlertCircle, Clock, FlaskConical
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';

function StatCard({ label, value, Icon, iconBg, iconColor }) {
  return (
    <div className="stat-card animate-fade-in-up">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 5, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/stats')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setError('Could not connect to the backend server.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    const apiURL = axios.defaults.baseURL || 'http://localhost:3001';
    const isLocal = apiURL.includes('localhost') || apiURL.includes('127.0.0.1');

    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(224,82,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={28} color="#E05252" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Backend Not Connected</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>{error}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          {isLocal 
            ? "Make sure your local Express backend is running (e.g., npm start inside /backend on port 3001)."
            : `Attempted to connect to your online backend at: ${apiURL}. Please verify it is running and accessible.`}
        </p>
        <Button onClick={() => window.location.reload()}>Retry Connection</Button>
      </div>
    );
  }

  const { totalLeads, activeCampaigns, emailsSent, responseRate, warmupActive, recentReplies, chartData } = stats;

  const customTooltipStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: 18,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
            Good morning 👋
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
            Your outreach platform is active. Track campaigns, leads, and replies below.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`badge ${warmupActive ? 'badge-success' : 'badge-secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12 }}>
            <Flame size={12} style={{ animation: warmupActive ? 'pulse 2s infinite' : 'none' }} />
            Warmup: {warmupActive ? 'Active' : 'Off'}
          </span>
          <span className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12 }}>
            <Clock size={12} />
            Sends: 10 AM – 4 PM EST
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard label="Total Leads" value={totalLeads} Icon={Users} iconBg="rgba(61,127,193,0.12)" iconColor="#3D7FC1" />
        <StatCard label="Active Campaigns" value={activeCampaigns} Icon={Target} iconBg="rgba(139,158,110,0.12)" iconColor="var(--color-accent)" />
        <StatCard label="Emails Sent" value={emailsSent} Icon={Mail} iconBg="rgba(61,156,110,0.12)" iconColor="#3D9C6E" />
        <StatCard label="Response Rate" value={`${responseRate}%`} Icon={TrendingUp} iconBg="rgba(180,146,78,0.12)" iconColor="var(--color-gold)" />
      </div>

      {/* Charts & Replies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 18, flexWrap: 'wrap' }} className="chart-grid">
        {/* Emails Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Emails Sent — Last 7 Days</CardTitle>
            <CardDescription>Daily send activity across active campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -15, right: 10, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.substring(5)}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 12 }}
                    itemStyle={{ color: 'var(--color-accent)', fontSize: 12 }}
                    cursor={{ fill: 'var(--color-accent-light)' }}
                  />
                  <Bar dataKey="sends" fill="var(--color-accent)" radius={[5, 5, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Replies */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={14} color="var(--color-accent)" />
              </div>
              <div>
                <CardTitle>Recent Replies</CardTitle>
                <CardDescription>Caught via IMAP polling</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ padding: '12px 22px 22px' }}>
            {recentReplies.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Mail size={36} style={{ opacity: 0.3, color: 'var(--color-accent)', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No replies yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentReplies.map(reply => (
                  <Link to="/replies" key={reply.id} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{
                      padding: '11px 14px',
                      background: 'var(--color-bg)',
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 2px 8px var(--color-shadow)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                          {reply.from_email}
                        </p>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {new Date(reply.received_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--color-accent)', fontWeight: 500, marginBottom: 3 }}>
                        {reply.campaign_name || 'Campaign'}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        "{reply.snippet}"
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
            { title: "Campaigns", href: "/campaigns", description: "Create HTML templates, set delays & limits", iconColor: 'var(--color-accent)' },
            { title: "Import Leads", href: "/leads", description: "Upload CSV or sync from Google Sheets", iconColor: '#3D7FC1' },
            { title: "Test & Debug", href: "/testing", description: "Test Discord, email, inbox poll & triggers", iconColor: '#8B5CF6' },
            { title: "Settings", href: "/settings", description: "Gmail credentials, Discord webhook & more", iconColor: 'var(--color-gold)' }
          ].map(({ title, href, description, iconColor }) => (
            <Link key={href} to={href} style={{ display: 'block', textDecoration: 'none' }}>
              <div
                className="card"
                style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--color-shadow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px var(--color-shadow)'; }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 3 }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{description}</p>
                </div>
                <ArrowRight size={16} color={iconColor} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
