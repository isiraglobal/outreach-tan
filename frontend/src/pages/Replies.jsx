import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Mail,
  MessageSquare,
  RefreshCw,
  Bell,
  CheckSquare,
  Square,
  Inbox
} from 'lucide-react';
import axios from 'axios';

export default function Replies() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReply, setSelectedReply] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadReplies = () => {
    setLoading(true);
    axios.get('/api/replies')
      .then(res => { setReplies(res.data); setLoading(false); })
      .catch(err => { console.error('Failed to load replies:', err); setLoading(false); });
  };

  useEffect(() => { loadReplies(); }, []);

  const handleToggleActioned = (reply) => {
    const nextVal = reply.actioned ? 0 : 1;
    axios.patch(`/api/replies/${reply.id}/actioned`, { actioned: nextVal })
      .then(() => {
        setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, actioned: nextVal } : r));
        if (selectedReply?.id === reply.id) setSelectedReply(prev => ({ ...prev, actioned: nextVal }));
      })
      .catch(console.error);
  };

  const handleReNotifyDiscord = (id) => {
    setIsSyncing(true);
    axios.post(`/api/replies/${id}/notify`)
      .then(() => { alert('Discord notification re-sent!'); loadReplies(); })
      .catch(() => alert('Discord notification failed. Check webhook URL.'))
      .finally(() => setIsSyncing(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Replies Inbox</h1>
          <p className="page-subtitle">Incoming responses captured via Gmail IMAP polling every 5 minutes.</p>
        </div>
        <Button variant="outline" onClick={loadReplies} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Sync Inbox
        </Button>
      </div>

      {/* Summary row */}
      {replies.length > 0 && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span>Total: <strong style={{ color: 'var(--color-text-primary)' }}>{replies.length}</strong></span>
          <span>Unactioned: <strong style={{ color: '#E05252' }}>{replies.filter(r => !r.actioned).length}</strong></span>
          <span>Resolved: <strong style={{ color: '#3D9C6E' }}>{replies.filter(r => r.actioned).length}</strong></span>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 18 }} className="replies-grid">
        {/* Left: Replies list */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inbox size={15} color="var(--color-accent)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>All Replies ({replies.length})</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Click to inspect</span>
          </div>
          <CardContent style={{ padding: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', flexDirection: 'column', gap: 12 }}>
                <div className="spinner" />
              </div>
            ) : replies.length === 0 ? (
              <div className="empty-state">
                <Mail size={36} className="empty-state-icon" />
                <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>No replies yet</h3>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-muted)', maxWidth: 240, marginInline: 'auto' }}>
                  IMAP checks inbox every 5 minutes automatically.
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {replies.map(reply => {
                  const isSelected = selectedReply?.id === reply.id;
                  return (
                    <div
                      key={reply.id}
                      onClick={() => setSelectedReply(reply)}
                      style={{
                        padding: '13px 22px',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-accent-light)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(244,241,237,0.6)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <p style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: reply.actioned ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                            textDecoration: reply.actioned ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {reply.from_email}
                          </p>
                          {!reply.actioned && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                          )}
                        </div>
                        <p style={{ margin: '0 0 2px', fontSize: 11.5, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {reply.subject}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{reply.snippet}"
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleActioned(reply); }}
                        title={reply.actioned ? 'Mark pending' : 'Mark resolved'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: reply.actioned ? 'var(--color-accent)' : 'var(--color-text-muted)', display: 'flex', flexShrink: 0 }}
                      >
                        {reply.actioned ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Detail Panel */}
        <Card>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} color="var(--color-accent)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>Reply Inspector</span>
          </div>
          <CardContent>
            {selectedReply ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedReply.from_email}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)' }}>{selectedReply.subject}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Received</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{new Date(selectedReply.received_at).toLocaleString()}</p>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

                {/* Message */}
                <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 9, padding: '14px', maxHeight: '28vh', overflowY: 'auto' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', fontStyle: 'italic', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    "{selectedReply.snippet}"
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
                  <Button
                    onClick={() => handleToggleActioned(selectedReply)}
                    variant={selectedReply.actioned ? 'outline' : 'default'}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {selectedReply.actioned ? 'Reopen Conversation' : '✓ Mark Resolved'}
                  </Button>
                  <Button
                    onClick={() => handleReNotifyDiscord(selectedReply.id)}
                    disabled={isSyncing}
                    variant="outline"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Bell size={13} color="var(--color-accent)" />
                    Re-notify Discord
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.25, marginBottom: 12, display: 'block', marginInline: 'auto' }} />
                <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>Select a reply to inspect its contents</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
