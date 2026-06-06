import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Plus, Play, Pause, StopCircle, Trash2, Edit3, Eye, Clock,
  Mail, ShieldCheck, AlertCircle, Code2, Type
} from 'lucide-react';
import axios from 'axios';

const STATUS_BADGE = {
  running: 'badge-success',
  paused:  'badge-warning',
  done:    'badge-info',
  draft:   'badge-secondary',
};

/* ─────────────────────────────────────────────────────────────────────
   HTML RICH EMAIL EDITOR
   Two modes: visual (contenteditable iframe) and raw HTML textarea
───────────────────────────────────────────────────────────────────── */
function HtmlEmailEditor({ value, onChange }) {
  const [mode, setMode] = useState('visual');
  const iframeRef = useRef(null);
  const isInitialized = useRef(false);

  const getDoc = () => iframeRef.current?.contentDocument;

  const syncIframeContent = useCallback(() => {
    const doc = getDoc();
    if (doc && doc.body) {
      doc.body.innerHTML = value || '';
    }
  }, [value]);

  // When switching TO visual, push latest HTML value into iframe
  useEffect(() => {
    if (mode === 'visual' && isInitialized.current) {
      syncIframeContent();
    }
  }, [mode]);

  const handleIframeLoad = () => {
    const doc = getDoc();
    if (!doc) return;
    doc.designMode = 'on';
    doc.body.style.cssText =
      'font-family:-apple-system,sans-serif;font-size:14px;color:#2C221C;padding:16px;margin:0;min-height:100%;outline:none;line-height:1.65;';
    doc.body.innerHTML = value || '';
    isInitialized.current = true;

    const emit = () => onChange(doc.body.innerHTML);
    doc.addEventListener('input', emit);
    doc.addEventListener('keyup', emit);
  };

  const execCmd = (cmd, val = null) => {
    const doc = getDoc();
    if (!doc) return;
    doc.execCommand(cmd, false, val);
    onChange(doc.body.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) execCmd('createLink', url);
  };

  const ToolBtn = ({ label, cmd, val, title: t }) => (
    <button
      type="button"
      title={t || label}
      onMouseDown={e => { e.preventDefault(); execCmd(cmd, val || null); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 7px', borderRadius: 5, fontSize: 12,
        fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: '1.5px solid var(--color-border-strong)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Toolbar row */}
      <div style={{
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px', gap: 8, flexWrap: 'wrap'
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 7, padding: 3, border: '1px solid var(--color-border)' }}>
          {[['visual', <Type key="v" size={11} />, 'Visual'], ['html', <Code2 key="h" size={11} />, 'HTML']].map(([m, icon, lbl]) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', border: 'none', borderRadius: 5,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: mode === m ? 'var(--color-accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--color-text-muted)'
            }}>
              {icon} {lbl}
            </button>
          ))}
        </div>

        {/* Format toolbar — only visual mode */}
        {mode === 'visual' && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <ToolBtn label="B" cmd="bold" title="Bold" />
            <ToolBtn label="I" cmd="italic" title="Italic" />
            <ToolBtn label="U" cmd="underline" title="Underline" />
            <span style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />
            <ToolBtn label="H1" cmd="formatBlock" val="h1" title="Heading 1" />
            <ToolBtn label="H2" cmd="formatBlock" val="h2" title="Heading 2" />
            <ToolBtn label="P" cmd="formatBlock" val="p" title="Paragraph" />
            <span style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />
            <ToolBtn label="• List" cmd="insertUnorderedList" title="Bullet list" />
            <button
              type="button"
              title="Insert link"
              onMouseDown={e => { e.preventDefault(); insertLink(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 7px', borderRadius: 5, fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}
            >
              Link
            </button>
            <span style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />
            <select
              onChange={e => { execCmd('fontSize', e.target.value); e.target.value = ''; }}
              defaultValue=""
              style={{ fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', outline: 'none' }}
            >
              <option value="" disabled>Size</option>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Editor area */}
      {mode === 'visual' ? (
        <iframe
          ref={iframeRef}
          onLoad={handleIframeLoad}
          title="email-editor"
          style={{ width: '100%', height: 220, border: 'none', background: '#fff', display: 'block' }}
          srcDoc={`<!doctype html><html><body style="font-family:sans-serif;padding:16px;margin:0;font-size:14px;color:#2C221C;line-height:1.65">${value || '<p>Type your email here...</p>'}</body></html>`}
        />
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          placeholder="<p>Write your HTML email here...</p>"
          style={{
            width: '100%', height: 220, border: 'none', padding: '14px',
            fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-primary)',
            background: '#fff', resize: 'none', outline: 'none',
            boxSizing: 'border-box', lineHeight: 1.7
          }}
        />
      )}

      {/* Variable chip bar */}
      <div style={{
        background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        padding: '6px 12px', fontSize: 10.5, color: 'var(--color-text-muted)',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600 }}>Click to insert:</span>
        {['{{name}}', '{{company}}', '{{email}}'].map(v => (
          <code
            key={v}
            onClick={() => mode === 'visual' ? execCmd('insertText', v) : onChange((value || '') + v)}
            style={{
              background: 'var(--color-accent-light)', border: '1px solid var(--color-border)',
              borderRadius: 4, padding: '1px 6px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 10.5, color: 'var(--color-accent)'
            }}
          >
            {v}
          </code>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>Unsubscribe footer auto-appended</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PREVIEW HELPER
───────────────────────────────────────────────────────────────────── */
function buildPreview(html) {
  if (!html) return '<p><em>No content yet.</em></p>';
  const body = html
    .replace(/\{\{name\}\}/gi, 'John Doe')
    .replace(/\{\{company\}\}/gi, 'Acme Corp')
    .replace(/\{\{email\}\}/gi, 'john@example.com');
  return body + '<br/><br/><hr style="border:none;border-top:1px solid #eee"/><p style="font-size:11px;color:#aaa;text-align:center">To unsubscribe, reply STOP.</p>';
}

/* ─────────────────────────────────────────────────────────────────────
   CAMPAIGNS PAGE
───────────────────────────────────────────────────────────────────── */
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body_template: '', delay_min: 60, delay_max: 180, daily_limit: 40 });
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/campaigns')
      .then(res => { setCampaigns(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setErr('');
    setForm({ name: '', subject: '', body_template: '', delay_min: 60, delay_max: 180, daily_limit: 40 });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setErr('');
    setForm({ name: c.name, subject: c.subject, body_template: c.body_template, delay_min: c.delay_min, delay_max: c.delay_max, daily_limit: c.daily_limit });
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim()) { setErr('Campaign name is required.'); return; }
    if (!form.subject.trim()) { setErr('Subject line is required.'); return; }
    if (!form.body_template || form.body_template.replace(/<[^>]*>/g, '').trim().length < 5) {
      setErr('Email body must have some content.'); return;
    }
    setSaving(true);
    setErr('');
    const req = editId ? axios.put(`/api/campaigns/${editId}`, form) : axios.post('/api/campaigns', form);
    req.then(() => { setShowForm(false); load(); })
      .catch(e => setErr(e.response?.data?.error || 'Save failed. Try again.'))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Delete this campaign permanently?')) return;
    axios.delete(`/api/campaigns/${id}`).then(load);
  };

  const action = (id, verb) => {
    axios.post(`/api/campaigns/${id}/${verb}`).then(load)
      .catch(e => console.error(`Campaign ${verb} failed:`, e));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create HTML email campaigns, set timing rules, and launch outreach.</p>
        </div>
        <Button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={15} /> New Campaign
        </Button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: 12 }}>
          <div className="spinner" />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Mail size={40} style={{ opacity: 0.3, color: 'var(--color-accent)', margin: '0 auto 14px', display: 'block' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>No campaigns yet</h3>
          <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--color-text-secondary)', maxWidth: 300, marginInline: 'auto' }}>
            Create your first campaign to define an HTML email template and start outreach.
          </p>
          <Button onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Plus size={14} /> Create First Campaign
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaigns.map(c => (
            <Card key={c.id} className="animate-fade-in-up" style={{ overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{c.name}</h3>
                    <span className={`badge ${STATUS_BADGE[c.status] || 'badge-secondary'}`} style={{ textTransform: 'capitalize' }}>
                      {c.status}
                    </span>
                    {c.body_template && /<[a-z]/i.test(c.body_template) && (
                      <span className="badge badge-info" style={{ fontSize: 10 }}>HTML</span>
                    )}
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Subject: "{c.subject}"
                  </p>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setPreviewCampaign(c)}
                    style={{ background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Eye size={13} /> Preview
                  </button>
                  <button onClick={() => openEdit(c)}
                    style={{ background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Edit3 size={13} /> Edit
                  </button>
                  <button onClick={() => del(c.id)}
                    style={{ background: 'none', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#E05252', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Card footer: stats + controls */}
              <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Clock size={12} color="var(--color-accent)" /> {c.delay_min}–{c.delay_max}s delay
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <ShieldCheck size={12} color="var(--color-accent)" /> {c.daily_limit}/day cap
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Mail size={12} color="var(--color-accent)" /> <strong style={{ color: 'var(--color-text-primary)' }}>{c.emails_sent || 0}</strong>&nbsp;sent
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status !== 'running' && c.status !== 'done' && (
                    <Button size="sm" onClick={() => action(c.id, 'start')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Play size={12} /> Start Sending
                    </Button>
                  )}
                  {c.status === 'running' && (
                    <button onClick={() => action(c.id, 'pause')}
                      style={{ background: '#D49F2A', border: 'none', color: '#fff', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  {c.status === 'paused' && (
                    <Button size="sm" onClick={() => action(c.id, 'start')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Play size={12} /> Resume
                    </Button>
                  )}
                  {c.status !== 'done' && (
                    <Button size="sm" variant="outline" onClick={() => action(c.id, 'stop')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <StopCircle size={12} style={{ color: '#E05252' }} /> Stop
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Campaign Editor Dialog ───────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false); }}>
        <DialogContent style={{ maxWidth: 660, maxHeight: '92vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Use visual mode to design an HTML email, or switch to HTML for custom code.
            </p>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Campaign Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q2 Partnership Outreach" />
            </div>

            <div>
              <Label>Subject Line *</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Quick question about {{company}}" />
              <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                Variables: {'{{name}}'}, {'{{company}}'}, {'{{email}}'}
              </p>
            </div>

            <div>
              <Label>Email Body *</Label>
              <HtmlEmailEditor
                value={form.body_template}
                onChange={val => setForm(f => ({ ...f, body_template: val }))}
              />
            </div>

            <div>
              <Label>Sending Rules</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { lbl: 'Min Delay (sec)', key: 'delay_min', min: 10 },
                  { lbl: 'Max Delay (sec)', key: 'delay_max', min: 10 },
                  { lbl: 'Daily Limit',     key: 'daily_limit', min: 1 }
                ].map(({ lbl, key, min }) => (
                  <div key={key}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{lbl}</p>
                    <Input type="number" min={min} value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                ⏰ Emails only send between <strong>10 AM – 4 PM US Eastern</strong>. Random delay protects deliverability.
              </p>
            </div>

            {err && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(224,82,82,0.08)', borderRadius: 8, border: '1px solid rgba(224,82,82,0.25)' }}>
                <AlertCircle size={14} color="#E05252" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#C03030' }}>{err}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ────────────────────────────────────────── */}
      <Dialog open={!!previewCampaign} onOpenChange={open => { if (!open) setPreviewCampaign(null); }}>
        <DialogContent style={{ maxWidth: 620 }}>
          <DialogHeader>
            <DialogTitle>📧 Email Preview</DialogTitle>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              Sample data: John Doe / Acme Corp
            </p>
          </DialogHeader>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Mock email headers */}
            <div style={{ background: 'var(--color-surface)', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, minWidth: 40 }}>FROM</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Your Account (via Outreach Platform)</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, minWidth: 40 }}>SUBJ</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {(previewCampaign?.subject || '')
                    .replace(/\{\{name\}\}/gi, 'John Doe')
                    .replace(/\{\{company\}\}/gi, 'Acme Corp')
                    .replace(/\{\{email\}\}/gi, 'john@example.com')}
                </span>
              </div>
            </div>
            {/* Email body render */}
            <div style={{ background: '#fff' }}>
              <iframe
                srcDoc={`<!doctype html><html><head><style>body{font-family:-apple-system,sans-serif;font-size:14px;color:#333;padding:20px;margin:0;line-height:1.65}a{color:#8B9E6E}</style></head><body>${buildPreview(previewCampaign?.body_template)}</body></html>`}
                style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
                title="email-preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'rgba(212,159,42,0.08)', borderRadius: 8, border: '1px solid rgba(212,159,42,0.2)' }}>
            <AlertCircle size={14} color="#D49F2A" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11.5, color: '#8B6200' }}>
              Sample data used for preview. Real emails use each lead's actual name, company, and email.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewCampaign(null)} style={{ justifyContent: 'center' }}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
