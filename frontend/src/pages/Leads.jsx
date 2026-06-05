import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Plus,
  Search,
  Trash2,
  Upload,
  RefreshCw,
  Play,
  XSquare,
  CheckCircle,
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import axios from 'axios';

const statusBadgeMap = {
  pending:  'badge-secondary',
  queued:   'badge-info',
  sent:     'badge-success',
  replied:  'badge-default',
  bounced:  'badge-danger',
  skipped:  'badge-warning',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('csv');
  const [csvFile, setCsvFile] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLeads = () => {
    setLoading(true);
    axios.get('/api/leads', { params: { status: statusFilter, search } })
      .then(res => {
        setLeads(res.data);
        setSelectedIds([]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load leads:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => loadLeads(), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(leads.map(l => l.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkStatusUpdate = (status) => {
    if (selectedIds.length === 0) return;
    axios.post('/api/leads/bulk-status', { ids: selectedIds, status })
      .then(() => loadLeads())
      .catch(err => console.error('Bulk status update failed:', err));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} leads? This cannot be undone.`)) return;
    axios.post('/api/leads/bulk-delete', { ids: selectedIds })
      .then(() => loadLeads())
      .catch(err => console.error('Bulk delete failed:', err));
  };

  const handleDeleteOne = (id) => {
    if (!confirm('Delete this lead?')) return;
    axios.delete(`/api/leads/${id}`)
      .then(() => loadLeads())
      .catch(err => console.error('Delete failed:', err));
  };

  const handleImportSubmit = async () => {
    if (importType === 'csv') {
      if (!csvFile) { alert('Please choose a CSV file first.'); return; }
      const formData = new FormData();
      formData.append('file', csvFile);
      setIsSyncing(true);
      axios.post('/api/leads/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(res => {
          alert(`Successfully imported ${res.data.count} leads.`);
          setShowImport(false);
          setCsvFile(null);
          loadLeads();
        })
        .catch(err => alert(err.response?.data?.error || 'CSV parse failed. Ensure column header is "email".'))
        .finally(() => setIsSyncing(false));
    } else {
      setIsSyncing(true);
      axios.post('/api/leads/sync-sheet')
        .then(res => {
          alert(`Google Sheets Sync complete. Imported ${res.data.count} new leads.`);
          setShowImport(false);
          loadLeads();
        })
        .catch(err => alert(err.response?.data?.error || 'Failed to sync Google Sheets leads.'))
        .finally(() => setIsSyncing(false));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Leads Database</h1>
          <p className="page-subtitle">Import contacts, queue email runs, and check delivery states.</p>
        </div>
        <Button onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Upload size={15} />
          Import Leads
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <Input
            placeholder="Search by email, name or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ minWidth: 140 }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="replied">Replied</option>
          <option value="bounced">Bounced</option>
          <option value="skipped">Skipped</option>
        </select>
        <Button variant="outline" onClick={loadLeads} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div
          className="animate-fade-in-up"
          style={{
            background: 'var(--color-accent)',
            borderRadius: 10,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleBulkStatusUpdate('queued')}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Play size={12} /> Queue
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('skipped')}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <XSquare size={12} /> Skip
            </button>
            <button
              onClick={handleBulkDelete}
              style={{ background: 'rgba(224,82,82,0.85)', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <Card style={{ overflow: 'hidden' }}>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', flexDirection: 'column', gap: 12 }}>
              <div className="spinner" />
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <FileSpreadsheet size={40} className="empty-state-icon" />
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>No leads found</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 280, marginInline: 'auto' }}>
                Upload a CSV or sync from Google Sheets to populate the outreach queue.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={leads.length > 0 && selectedIds.length === leads.length}
                        style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => {
                    const isChecked = selectedIds.includes(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        style={{ background: isChecked ? 'var(--color-accent-light)' : undefined }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectOne(lead.id)}
                            style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{lead.email}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{lead.name || '—'}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{lead.company || '—'}</td>
                        <td>
                          <span className="badge badge-outline" style={{ textTransform: 'capitalize' }}>{lead.source}</span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeMap[lead.status] || 'badge-default'}`} style={{ textTransform: 'capitalize' }}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteOne(lead.id)}
                            title="Delete lead"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              borderRadius: 6,
                              color: '#E05252',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
              Add new contacts to your outreach database.
            </p>
          </DialogHeader>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 9, padding: 4, border: '1px solid var(--color-border)', marginBottom: 16 }}>
            {['csv', 'sheet'].map(type => (
              <button
                key={type}
                onClick={() => setImportType(type)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: importType === type ? 'var(--color-accent)' : 'transparent',
                  color: importType === type ? '#fff' : 'var(--color-text-secondary)',
                  boxShadow: importType === type ? '0 2px 6px rgba(139,158,110,0.25)' : 'none'
                }}
              >
                {type === 'csv' ? 'Upload CSV File' : 'Sync Google Sheets'}
              </button>
            ))}
          </div>

          {importType === 'csv' ? (
            <div>
              <Label>Choose CSV File</Label>
              <div style={{
                border: '2px dashed var(--color-border-strong)',
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                background: 'var(--color-bg)',
                marginTop: 5
              }}>
                <Upload size={28} color="var(--color-accent)" style={{ marginBottom: 10 }} />
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files[0])}
                  style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
                />
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Required column: "email". Optional: "name", "company"
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '28px 20px',
              background: 'var(--color-bg)',
              borderRadius: 10,
              border: '1px solid var(--color-border)'
            }}>
              <FileSpreadsheet size={36} color="var(--color-accent)" style={{ marginBottom: 10 }} />
              <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)' }}>Pull from Google Sheets</p>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-muted)', maxWidth: 280, marginInline: 'auto' }}>
                Pulls from the Google Sheet URL configured in Settings. Make sure sharing is set to "Anyone with link".
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImportSubmit} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {isSyncing ? (
                <><RefreshCw size={14} className="animate-spin" /> Importing...</>
              ) : (
                <><CheckCircle size={14} /> Start Import</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
