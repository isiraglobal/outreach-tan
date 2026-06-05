import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  MailWarning
} from 'lucide-react';
import axios from 'axios';

export default function SentLog() {
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    axios.get('/api/sent', { params: { campaignId: campaignFilter } })
      .then(res => { setLogs(res.data); setLoading(false); })
      .catch(err => { console.error('Failed to load sent logs:', err); setLoading(false); });
  };

  useEffect(() => {
    axios.get('/api/campaigns').then(res => setCampaigns(res.data)).catch(console.error);
  }, []);

  useEffect(() => { loadLogs(); }, [campaignFilter]);

  const filteredLogs = logs.filter(l =>
    !search || [l.to_email, l.subject, l.campaign_name].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Recipient Email', 'Subject', 'Campaign', 'Sent At', 'Status'];
    const rows = filteredLogs.map(l => [
      l.to_email,
      `"${(l.subject || '').replace(/"/g, '""')}"`,
      `"${(l.campaign_name || 'N/A').replace(/"/g, '""')}"`,
      l.sent_at,
      l.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sent_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Sent Log</h1>
          <p className="page-subtitle">Audit trail of every email dispatched by the outreach engine.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button onClick={handleExportCSV} disabled={filteredLogs.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <Input placeholder="Search by email, subject or campaign..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className="form-select" style={{ minWidth: 180 }}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      {filteredLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span>Total: <strong style={{ color: 'var(--color-text-primary)' }}>{filteredLogs.length}</strong></span>
          <span>Replied: <strong style={{ color: '#3D9C6E' }}>{filteredLogs.filter(l => l.status === 'replied').length}</strong></span>
          <span>Bounced: <strong style={{ color: '#E05252' }}>{filteredLogs.filter(l => l.status === 'bounced').length}</strong></span>
        </div>
      )}

      {/* Log Table */}
      <Card style={{ overflow: 'hidden' }}>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', flexDirection: 'column', gap: 12 }}>
              <div className="spinner" />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">
              <MailWarning size={40} className="empty-state-icon" />
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>No sends recorded</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 260, marginInline: 'auto' }}>
                Start a campaign to trigger outbound sends.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Campaign</th>
                    <th>Sent At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.to_email}</td>
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{log.subject}</td>
                      <td>
                        <span className="badge badge-outline">{log.campaign_name || 'System Warmup'}</span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'replied' ? 'badge-default' : log.status === 'bounced' ? 'badge-danger' : 'badge-success'}`} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'max-content', textTransform: 'capitalize' }}>
                          <CheckCircle2 size={10} />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
