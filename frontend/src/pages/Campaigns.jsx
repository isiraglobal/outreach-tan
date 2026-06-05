import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Plus,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Edit3,
  Eye,
  Clock,
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const statusBadgeMap = {
  running: 'badge-success',
  paused:  'badge-warning',
  done:    'badge-info',
  draft:   'badge-secondary',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body_template: '', delay_min: 60, delay_max: 180, daily_limit: 40 });
  const [previewCampaign, setPreviewCampaign] = useState(null);

  const loadCampaigns = () => {
    setLoading(true);
    axios.get('/api/campaigns')
      .then(res => { setCampaigns(res.data); setLoading(false); })
      .catch(err => { console.error('Failed to load campaigns:', err); setLoading(false); });
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleCreateNew = () => {
    setEditId(null);
    setForm({ name: '', subject: '', body_template: '', delay_min: 60, delay_max: 180, daily_limit: 40 });
    setShowForm(true);
  };

  const handleEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, subject: c.subject, body_template: c.body_template, delay_min: c.delay_min, delay_max: c.delay_max, daily_limit: c.daily_limit });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.subject || !form.body_template) {
      alert('Campaign Name, Subject, and Body template are required.');
      return;
    }
    const request = editId ? axios.put(`/api/campaigns/${editId}`, form) : axios.post('/api/campaigns', form);
    request.then(() => { setShowForm(false); loadCampaigns(); }).catch(err => console.error('Save failed:', err));
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this campaign?')) return;
    axios.delete(`/api/campaigns/${id}`).then(() => loadCampaigns()).catch(console.error);
  };

  const toggleStatus = (id, action) => {
    axios.post(`/api/campaigns/${id}/${action}`).then(() => loadCampaigns()).catch(err => console.error(`Campaign ${action} failed:`, err));
  };

  const renderPreview = (template) => {
    if (!template) return '';
    return template
      .replace(/\{\{name\}\}/gi, 'John Doe')
      .replace(/\{\{company\}\}/gi, 'Acme Corp')
      + '\n\n---\nTo stop receiving emails, reply with STOP.';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Configure templates, sending rules, and run email outreach.</p>
        </div>
        <Button onClick={handleCreateNew} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={15} /> New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: 12 }}>
          <div className="spinner" />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Mail size={40} style={{ opacity: 0.3, color: 'var(--color-accent)', marginBottom: 14, display: 'block', marginInline: 'auto' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>No campaigns yet</h3>
          <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--color-text-secondary)', maxWidth: 300, marginInline: 'auto' }}>
            Create a campaign to define email templates and start bulk outreach.
          </p>
          <Button onClick={handleCreateNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Plus size={14} /> Create First Campaign
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaigns.map(c => (
            <Card key={c.id} className="animate-fade-in-up" style={{ overflow: 'hidden' }}>
              {/* Campaign Header */}
              <div style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{c.name}</h3>
                    <span className={`badge ${statusBadgeMap[c.status] || 'badge-secondary'}`} style={{ textTransform: 'capitalize' }}>
                      {c.status}
                    </span>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Subject: "{c.subject}"
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setPreviewCampaign(c)}
                    style={{ background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
                    style={{ background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ background: 'none', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#E05252', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Campaign Stats & Controls */}
              <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Clock size={13} color="var(--color-accent)" />
                    Delay: {c.delay_min}–{c.delay_max}s
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <ShieldCheck size={13} color="var(--color-accent)" />
                    Daily cap: {c.daily_limit}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Mail size={13} color="var(--color-accent)" />
                    Sent: <strong style={{ color: 'var(--color-text-primary)', marginLeft: 2 }}>{c.emails_sent}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status !== 'running' ? (
                    <Button size="sm" onClick={() => toggleStatus(c.id, 'start')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Play size={12} /> Start Sending
                    </Button>
                  ) : (
                    <button
                      onClick={() => toggleStatus(c.id, 'pause')}
                      style={{ background: '#D49F2A', border: 'none', color: '#fff', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  {c.status !== 'done' && (
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, 'stop')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <StopCircle size={12} style={{ color: '#E05252' }} /> Stop
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Editor Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Campaign Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Q2 Partnership Outreach" />
            </div>
            <div>
              <Label>Subject Line *</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Question about {{company}}" />
              <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>Supports {"{{name}}"} and {"{{company}}"} variables</p>
            </div>
            <div>
              <Label>Body Template *</Label>
              <Textarea
                value={form.body_template}
                onChange={e => setForm({ ...form, body_template: e.target.value })}
                rows={6}
                placeholder={"Hi {{name}},\n\nI noticed your team at {{company}} is growing..."}
              />
              <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>Unsubscribe footer appended automatically.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <Label>Min Delay (sec)</Label>
                <Input type="number" value={form.delay_min} onChange={e => setForm({ ...form, delay_min: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max Delay (sec)</Label>
                <Input type="number" value={form.delay_max} onChange={e => setForm({ ...form, delay_max: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Daily Send Limit</Label>
                <Input type="number" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>Variables shown substituted with sample data.</p>
          </DialogHeader>

          <div style={{ background: 'var(--color-bg)', borderRadius: 10, border: '1px solid var(--color-border)', padding: '16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</p>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {(previewCampaign?.subject || '').replace(/\{\{name\}\}/gi, 'John Doe').replace(/\{\{company\}\}/gi, 'Acme Corp')}
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 14px' }} />
            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</p>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontFamily: 'var(--font-sans)', background: '#fff', padding: '12px 14px', borderRadius: 7, border: '1px solid var(--color-border)' }}>
              {renderPreview(previewCampaign?.body_template)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'rgba(212,159,42,0.08)', borderRadius: 8, border: '1px solid rgba(212,159,42,0.2)', marginTop: 8 }}>
            <AlertCircle size={14} color="#D49F2A" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11.5, color: '#8B6200' }}>{"{{name}}"} → John Doe · {"{{company}}"} → Acme Corp (sample preview data)</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewCampaign(null)} style={{ width: '100%', justifyContent: 'center' }}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
