const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendDiscordAlert } = require('../discord');

// 1. GET /api/sent - List all sent emails
router.get('/sent', (req, res) => {
  try {
    const { campaignId, status } = req.query;
    let query = `
      SELECT s.*, c.name as campaign_name 
      FROM sent_emails s
      LEFT JOIN campaigns c ON s.campaign_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (campaignId) {
      conditions.push('s.campaign_id = ?');
      params.push(Number(campaignId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.sent_at DESC';

    const sent = db.prepare(query).all(...params);

    // Map lead status for UI compatibility
    // Since the frontend SentLog expects email tracking status, we resolve this.
    res.json(sent.map(item => ({
      ...item,
      // Default state is 'sent', unless replies exist
      status: db.prepare("SELECT id FROM replies WHERE sent_email_id = ? LIMIT 1").get(item.id) ? 'replied' : 'sent'
    })));
  } catch (error) {
    console.error('[API Emails Error] GET /sent failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/replies - List replies received
router.get('/replies', (req, res) => {
  try {
    const replies = db.prepare(`
      SELECT r.*, c.name as campaign_name, s.to_email as lead_email
      FROM replies r
      LEFT JOIN sent_emails s ON r.sent_email_id = s.id
      LEFT JOIN campaigns c ON s.campaign_id = c.id
      ORDER BY r.received_at DESC
    `).all();

    res.json(replies);
  } catch (error) {
    console.error('[API Emails Error] GET /replies failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/replies/:id/notify - Re-send Discord notification alert for a specific reply
router.post('/replies/:id/notify', async (req, res) => {
  try {
    const { id } = req.params;
    const reply = db.prepare(`
      SELECT r.*, c.name as campaign_name, l.name as lead_name, l.company as lead_company
      FROM replies r
      LEFT JOIN sent_emails s ON r.sent_email_id = s.id
      LEFT JOIN leads l ON s.lead_id = l.id
      LEFT JOIN campaigns c ON s.campaign_id = c.id
      WHERE r.id = ?
    `).get(id);

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    await sendDiscordAlert({
      from_email: reply.from_email,
      lead_name: reply.lead_name,
      lead_company: reply.lead_company,
      campaign_name: reply.campaign_name,
      subject: reply.subject,
      snippet: reply.snippet
    });

    // Mark notified
    db.prepare('UPDATE replies SET discord_notified = 1 WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('[API Emails Error] POST /replies/:id/notify failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. PATCH /api/replies/:id/actioned - Update reply actioned status
router.patch('/replies/:id/actioned', (req, res) => {
  try {
    const { id } = req.params;
    const { actioned } = req.body;
    
    db.prepare('UPDATE replies SET actioned = ? WHERE id = ?').run(actioned ? 1 : 0, id);
    res.json({ success: true });
  } catch (error) {
    console.error('[API Emails Error] PATCH /replies/:id/actioned failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

