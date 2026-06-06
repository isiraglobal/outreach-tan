import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  MessageSquare, Mail, RefreshCw, PlayCircle, Send,
  CheckCircle, AlertCircle, Terminal, Zap, Clock, Bell,
  Database, Wifi, WifiOff
} from 'lucide-react';
import axios from 'axios';

/* ─── Tool Card ──────────────────────────────────────── */
function ToolCard({ icon: Icon, iconBg, title, description, children }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={16} color="var(--color-accent)" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{description}</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Result Panel ───────────────────────────────────── */
function ResultPanel({ result }) {
  if (!result) return null;
  return (
    <div style={{
      marginTop: 12,
      padding: '12px 14px',
      borderRadius: 8,
      border: `1px solid ${result.ok ? 'rgba(61,156,110,0.3)' : 'rgba(224,82,82,0.3)'}`,
      background: result.ok ? 'rgba(61,156,110,0.06)' : 'rgba(224,82,82,0.06)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }}>
      {result.ok
        ? <CheckCircle size={15} color="#3D9C6E" style={{ flexShrink: 0, marginTop: 1 }} />
        : <AlertCircle size={15} color="#E05252" style={{ flexShrink: 0, marginTop: 1 }} />
      }
      <pre style={{
        margin: 0,
        fontSize: 12,
        color: result.ok ? '#2A6B4A' : '#8B2020',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'monospace',
        lineHeight: 1.55
      }}>
        {result.message}
      </pre>
    </div>
  );
}

/* ─── Testing Page ───────────────────────────────────── */
export default function Testing() {
  // Discord test
  const [discordResult, setDiscordResult] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  // Email ping test
  const [testEmailTo, setTestEmailTo] = useState('');
  const [emailResult, setEmailResult] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Inbox poll
  const [pollResult, setPollResult] = useState(null);
  const [pollLoading, setPollLoading] = useState(false);

  // Campaign send trigger
  const [sendResult, setSendResult] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);

  // Sheets sync
  const [sheetsResult, setSheetsResult] = useState(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);

  // Full workflow
  const [fullResult, setFullResult] = useState(null);
  const [fullLoading, setFullLoading] = useState(false);

  // Backend connection test
  const [pingResult, setPingResult] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);

  /* Helpers */
  const run = async (setLoading, setResult, fn) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fn();
      setResult({ ok: true, message: typeof res === 'string' ? res : JSON.stringify(res, null, 2) });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data || err.message || 'Request failed';
      setResult({ ok: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2) });
    } finally {
      setLoading(false);
    }
  };

  /* ── Actions ─────────────────────────────────────────────── */

  const testBackendPing = () => run(setPingLoading, setPingResult, async () => {
    const res = await axios.get('/api/stats');
    return `✅ Backend connected!\n\nStats:\n• Total Leads: ${res.data.totalLeads}\n• Active Campaigns: ${res.data.activeCampaigns}\n• Emails Sent: ${res.data.emailsSent}\n• Response Rate: ${res.data.responseRate}%\n• Warmup Active: ${res.data.warmupActive}`;
  });

  const testDiscord = () => run(setDiscordLoading, setDiscordResult, async () => {
    const res = await axios.post('/api/settings/test-discord', {});
    return '✅ Discord webhook test message sent!\nCheck your Discord channel — you should see an embed with "System Test Campaign".';
  });

  const sendTestEmail = () => {
    if (!testEmailTo.trim() || !testEmailTo.includes('@')) {
      setEmailResult({ ok: false, message: 'Enter a valid recipient email address.' });
      return;
    }
    run(setEmailLoading, setEmailResult, async () => {
      const res = await axios.post('/api/cron/send-test-email', { to: testEmailTo });
      return `✅ Test email sent to: ${testEmailTo}\n\nCheck that inbox — it should arrive within a minute.\nIf it doesn't arrive, check your Gmail App Password in Settings.`;
    });
  };

  const triggerInboxPoll = () => run(setPollLoading, setPollResult, async () => {
    const res = await axios.post('/api/cron/poll');
    return `✅ ${res.data.message || 'IMAP inbox poll completed.'}\n\nThe system checked your Gmail inbox for replies to outreach emails. Any new replies will appear in the Replies tab.`;
  });

  const triggerCampaignSend = () => run(setSendLoading, setSendResult, async () => {
    const res = await axios.post('/api/cron/send');
    return `✅ ${res.data.message || 'Mailer queue triggered.'}\n\nThe campaign sender is now processing queued leads. Emails will only send if:\n• There are "queued" or "pending" leads\n• A campaign is set to "running"\n• Current time is 10 AM – 4 PM US Eastern`;
  });

  const triggerSheetsSync = () => run(setSheetsLoading, setSheetsResult, async () => {
    const res = await axios.post('/api/cron/sync-sheets');
    const count = res.data.result?.count || 0;
    return `✅ Google Sheets sync complete!\n• New leads imported: ${count}\n\nLeads are inserted with status "pending". Go to Leads tab to see them.`;
  });

  const triggerAll = () => run(setFullLoading, setFullResult, async () => {
    const res = await axios.post('/api/cron/trigger-all');
    const steps = res.data.steps || [];
    return `✅ Full workflow triggered!\n\n${steps.join('\n')}`;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 820 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Testing & Tools</h1>
        <p className="page-subtitle">Manually test every integration — Discord alerts, email delivery, inbox polling, and full workflow triggers.</p>
      </div>

      {/* Backend Connection Status */}
      <ToolCard
        icon={Wifi}
        iconBg="rgba(61,156,110,0.12)"
        title="Backend Connection Test"
        description="Verify the backend API is reachable and returning data. Run this first to confirm your server is online."
      >
        <Button
          onClick={testBackendPing}
          disabled={pingLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          {pingLoading ? <RefreshCw size={14} className="animate-spin" /> : <Wifi size={14} />}
          {pingLoading ? 'Checking...' : 'Test Backend Connection'}
        </Button>
        <ResultPanel result={pingResult} />
      </ToolCard>

      {/* Discord Test */}
      <ToolCard
        icon={MessageSquare}
        iconBg="rgba(88,101,242,0.12)"
        title="Discord Webhook Test"
        description="Send a test embed message to your configured Discord webhook. Verify reply alerts will work before going live."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Uses the webhook URL saved in Settings → Discord Notifications. Make sure you have saved it there first.
          </p>
          <Button
            onClick={testDiscord}
            disabled={discordLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            {discordLoading ? <RefreshCw size={14} className="animate-spin" /> : <MessageSquare size={14} />}
            {discordLoading ? 'Sending...' : 'Send Test Discord Alert'}
          </Button>
        </div>
        <ResultPanel result={discordResult} />
      </ToolCard>

      {/* Test Email Send */}
      <ToolCard
        icon={Send}
        iconBg="rgba(139,158,110,0.12)"
        title="Send Test Email"
        description="Send a single test email from your configured Gmail account to verify SMTP authentication works correctly."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <Label>Recipient Email Address</Label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Input
                type="email"
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                placeholder="your@email.com"
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && sendTestEmail()}
              />
              <Button
                onClick={sendTestEmail}
                disabled={emailLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                {emailLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                {emailLoading ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
            This sends a real email from your Gmail account. Uses your GMAIL_USER and GMAIL_APP_PASSWORD from Settings.
          </p>
        </div>
        <ResultPanel result={emailResult} />
      </ToolCard>

      {/* Inbox Poll */}
      <ToolCard
        icon={RefreshCw}
        iconBg="rgba(61,127,193,0.12)"
        title="Manual Inbox Poll"
        description="Force the IMAP poller to check Gmail right now for any reply emails. Normally runs every 5 minutes automatically."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Polls your Gmail inbox via IMAP, detects replies to outreach emails, stores them in the database, and fires Discord notifications.
          </p>
          <Button
            variant="outline"
            onClick={triggerInboxPoll}
            disabled={pollLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            {pollLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {pollLoading ? 'Polling inbox...' : 'Poll Inbox Now'}
          </Button>
        </div>
        <ResultPanel result={pollResult} />
      </ToolCard>

      {/* Campaign Send Trigger */}
      <ToolCard
        icon={PlayCircle}
        iconBg="rgba(212,159,42,0.12)"
        title="Trigger Campaign Sends"
        description="Manually fire the campaign mailer engine. It picks up all running campaigns and sends to queued/pending leads."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '10px 12px', background: 'rgba(212,159,42,0.06)', borderRadius: 8, border: '1px solid rgba(212,159,42,0.2)', fontSize: 12, color: '#8B6200' }}>
            <span>⏰ Emails only send 10 AM – 4 PM ET</span>
            <span>•</span>
            <span>📋 Campaigns must be "running"</span>
            <span>•</span>
            <span>👥 Leads must be "queued" or "pending"</span>
          </div>
          <Button
            onClick={triggerCampaignSend}
            disabled={sendLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            {sendLoading ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
            {sendLoading ? 'Triggering...' : 'Trigger Campaign Sends'}
          </Button>
        </div>
        <ResultPanel result={sendResult} />
      </ToolCard>

      {/* Sheets Sync */}
      <ToolCard
        icon={Database}
        iconBg="rgba(34,166,106,0.12)"
        title="Force Google Sheets Sync"
        description="Immediately pull leads from your configured Google Sheet and import them into the leads database."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Reads the Google Sheet URL from Settings. The sheet must have an "email" column header. Duplicate emails are ignored.
          </p>
          <Button
            variant="outline"
            onClick={triggerSheetsSync}
            disabled={sheetsLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            {sheetsLoading ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
            {sheetsLoading ? 'Syncing sheets...' : 'Sync Google Sheets Now'}
          </Button>
        </div>
        <ResultPanel result={sheetsResult} />
      </ToolCard>

      {/* Full Workflow */}
      <ToolCard
        icon={Zap}
        iconBg="rgba(139,158,110,0.12)"
        title="Run Full Workflow"
        description="Execute all three steps in sequence: sync Google Sheets → trigger campaign sends → poll inbox for replies."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'nowrap', overflow: 'auto' }}>
            {[
              ['1', 'Sync Sheets', 'Import leads'],
              ['2', 'Send Emails', 'Run campaigns'],
              ['3', 'Poll Inbox', 'Catch replies']
            ].map(([num, title, sub], i, arr) => (
              <React.Fragment key={num}>
                <div style={{
                  flex: '1 1 auto',
                  minWidth: 100,
                  padding: '10px 12px',
                  background: 'var(--color-accent-light)',
                  borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : 0,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-accent)' }}>{num}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>{sub}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)', color: 'var(--color-accent)', fontSize: 14, fontWeight: 700 }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
          <Button
            onClick={triggerAll}
            disabled={fullLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            {fullLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {fullLoading ? 'Running full workflow...' : 'Run Full Workflow Now'}
          </Button>
        </div>
        <ResultPanel result={fullResult} />
      </ToolCard>

      {/* Cron Schedule Reference */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Clock size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>Automatic Schedule</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { label: 'Inbox Polling', schedule: 'Every 5 minutes', note: 'IMAP reply detection', color: '#3D7FC1' },
            { label: 'Warmup Emails', schedule: 'Twice daily', note: '9 AM & 3 PM ET', color: '#E05252' },
            { label: 'Sheets Sync', schedule: 'Every 15 minutes', note: 'New leads from Sheet', color: '#3D9C6E' },
            { label: 'Campaign Sends', schedule: '10 AM – 4 PM ET', note: 'Respects daily limits', color: 'var(--color-gold)' }
          ].map(({ label, schedule, note, color }) => (
            <div key={label} style={{
              padding: '12px 14px',
              background: 'var(--color-bg)',
              borderRadius: 9,
              border: '1px solid var(--color-border)',
              borderLeft: `3px solid ${color}`
            }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color, fontWeight: 600 }}>{schedule}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
