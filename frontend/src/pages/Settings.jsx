import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import {
  Mail,
  Flame,
  FileSpreadsheet,
  MessageSquare,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Save
} from 'lucide-react';
import axios from 'axios';

function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color="var(--color-accent)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{description}</p>
        </div>
      </div>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [form, setForm] = useState({
    GMAIL_USER: '',
    GMAIL_APP_PASSWORD: '',
    DISCORD_WEBHOOK_URL: '',
    WARMUP_EMAILS: '',
    WARMUP_ENABLED: 'true',
    GOOGLE_SHEET_URL: '',
    GOOGLE_SERVICE_ACCOUNT_JSON: './service-account.json'
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => { setForm(res.data); setLoading(false); })
      .catch(err => { console.error('Failed to load settings:', err); setLoading(false); });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    axios.post('/api/settings', form)
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch(() => alert('Failed to save settings.'))
      .finally(() => setIsSaving(false));
  };

  const handleTestDiscord = () => {
    setIsTesting(true);
    axios.post('/api/settings/test-discord', { webhookUrl: form.DISCORD_WEBHOOK_URL })
      .then(() => alert('Discord test alert sent! Check your channel.'))
      .catch(() => alert('Discord test failed. Verify your webhook URL.'))
      .finally(() => setIsTesting(false));
  };

  const handleResetAction = (action) => {
    const message = action === 'clear_logs'
      ? 'Permanently delete all sent email history, replies and warmup logs?'
      : 'Reset all lead statuses back to "pending"?';
    if (!confirm(message)) return;
    axios.post('/api/settings/reset-database', { action })
      .then(res => alert(res.data.message))
      .catch(() => alert('Database reset action failed.'));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure Gmail, warmup, Google Sheets, Discord, and database tools.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: saved ? '#3D9C6E' : undefined }}
        >
          {isSaving ? (
            <><RefreshCw size={14} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save All Settings</>
          )}
        </Button>
      </div>

      {/* Gmail */}
      <SettingSection
        icon={Mail}
        title="Gmail Account"
        description="Uses App Passwords (not your master password). Generate one in Google Settings → 2FA → App Passwords."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Gmail Address</Label>
            <Input value={form.GMAIL_USER} onChange={e => setForm({ ...form, GMAIL_USER: e.target.value })} placeholder="you@gmail.com" />
          </div>
          <div>
            <Label>16-char App Password</Label>
            <Input type="password" value={form.GMAIL_APP_PASSWORD} onChange={e => setForm({ ...form, GMAIL_APP_PASSWORD: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" />
          </div>
        </div>
      </SettingSection>

      {/* Warmup */}
      <SettingSection
        icon={Flame}
        title="Email Warmup"
        description="Sends small friendly emails to safe accounts twice daily to improve sender reputation."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="warmup-enabled"
              checked={form.WARMUP_ENABLED === 'true'}
              onChange={e => setForm({ ...form, WARMUP_ENABLED: e.target.checked ? 'true' : 'false' })}
              style={{ accentColor: 'var(--color-accent)', width: 15, height: 15, cursor: 'pointer' }}
            />
            <label htmlFor="warmup-enabled" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              Enable Automatic Warmup (Runs twice daily)
            </label>
          </div>
          <div>
            <Label>Warmup Target Emails (comma-separated)</Label>
            <Input
              value={form.WARMUP_EMAILS}
              onChange={e => setForm({ ...form, WARMUP_EMAILS: e.target.value })}
              placeholder="friend1@gmail.com, yoursecond@gmail.com"
            />
            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              Random conversational emails are sent to addresses in this list.
            </p>
          </div>
        </div>
      </SettingSection>

      {/* Google Sheets */}
      <SettingSection
        icon={FileSpreadsheet}
        title="Google Sheets Integration"
        description="Pull leads from a spreadsheet or push sent records to a logs sheet tab."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>Google Spreadsheet URL</Label>
            <Input
              value={form.GOOGLE_SHEET_URL}
              onChange={e => setForm({ ...form, GOOGLE_SHEET_URL: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/SHEET_ID/edit"
            />
            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              Set sharing to "Anyone with the link can view."
            </p>
          </div>
          <div>
            <Label>Service Account JSON File Path</Label>
            <Input
              value={form.GOOGLE_SERVICE_ACCOUNT_JSON}
              onChange={e => setForm({ ...form, GOOGLE_SERVICE_ACCOUNT_JSON: e.target.value })}
              placeholder="./service-account.json"
            />
            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              Upload service account JSON to backend path to log sent data back to Sheets.
            </p>
          </div>
        </div>
      </SettingSection>

      {/* Discord */}
      <SettingSection
        icon={MessageSquare}
        title="Discord Notifications"
        description="Receive channel alerts when new replies are detected or campaigns are paused."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Label>Discord Webhook URL</Label>
            <Input
              value={form.DISCORD_WEBHOOK_URL}
              onChange={e => setForm({ ...form, DISCORD_WEBHOOK_URL: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <Button
            variant="outline"
            onClick={handleTestDiscord}
            disabled={isTesting || !form.DISCORD_WEBHOOK_URL}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <MessageSquare size={13} />
            {isTesting ? 'Sending test...' : 'Test Discord Notification'}
          </Button>
        </div>
      </SettingSection>

      {/* Danger Zone */}
      <Card style={{ border: '2px solid rgba(224, 82, 82, 0.4)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(224,82,82,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(224,82,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} color="#E05252" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#C44040' }}>Danger Zone</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#8B4040' }}>Irreversible actions — use with caution</p>
          </div>
        </div>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                action: 'clear_logs',
                title: 'Purge Sent Emails & Replies Logs',
                desc: 'Clears sent_emails, replies, and warmup tables from the database.',
                label: 'Purge Logs'
              },
              {
                action: 'reset_leads',
                title: 'Reset All Lead Statuses',
                desc: 'Resets status of all leads back to "pending", allowing campaigns to re-mail them.',
                label: 'Reset Statuses'
              }
            ].map(({ action, title, desc, label }) => (
              <div
                key={action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px',
                  background: 'rgba(224,82,82,0.04)',
                  border: '1px solid rgba(224,82,82,0.15)',
                  borderRadius: 9,
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#C44040' }}>{title}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#8B4040' }}>{desc}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleResetAction(action)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {action === 'clear_logs' ? <Trash2 size={12} /> : <RefreshCw size={12} />}
                  {label}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
