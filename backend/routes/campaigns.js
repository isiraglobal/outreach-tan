const express = require('express');
const router = express.Router();
const db = require('../db');
const { runCampaignSender } = require('../mailer');
const { sendCampaignUpdateAlert } = require('../discord');

// 1. GET /api/campaigns - List all campaigns (including a count of sent emails and associated leads)
router.get('/', (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = c.id) as emails_sent
      FROM campaigns c
      ORDER BY c.created_at DESC
    `).all();

    // Attach total queued leads count in system to make statistics richer
    const totalQueuedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'queued'").get().count;
    
    // Format response to send campaigns and current queued leads context
    res.json(campaigns.map(c => ({
      ...c,
      leads: { length: totalQueuedLeads } // compatible with frontend UI expect
    })));
  } catch (error) {
    console.error('[API Campaigns Error] GET / failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/campaigns - Create a new campaign
router.post('/', (req, res) => {
  try {
    const { name, subject, body_template, delay_min, delay_max, daily_limit } = req.body;

    if (!name || !subject || !body_template) {
      return res.status(400).json({ error: 'Name, Subject, and Body template are required' });
    }

    const info = db.prepare(`
      INSERT INTO campaigns (name, subject, body_template, delay_min, delay_max, daily_limit, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      name,
      subject,
      body_template,
      delay_min !== undefined ? Number(delay_min) : 60,
      delay_max !== undefined ? Number(delay_max) : 180,
      daily_limit !== undefined ? Number(daily_limit) : 40
    );

    const newCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCampaign);
  } catch (error) {
    console.error('[API Campaigns Error] POST / failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. PUT /api/campaigns/:id - Update an existing campaign
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body_template, delay_min, delay_max, daily_limit, status } = req.body;

    const current = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    db.prepare(`
      UPDATE campaigns 
      SET name = ?, subject = ?, body_template = ?, delay_min = ?, delay_max = ?, daily_limit = ?, status = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : current.name,
      subject !== undefined ? subject : current.subject,
      body_template !== undefined ? body_template : current.body_template,
      delay_min !== undefined ? Number(delay_min) : current.delay_min,
      delay_max !== undefined ? Number(delay_max) : current.delay_max,
      daily_limit !== undefined ? Number(daily_limit) : current.daily_limit,
      status !== undefined ? status : current.status,
      id
    );

    const updatedCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    
    // Send Discord update alert if status changed
    if (status && status !== current.status) {
      sendCampaignUpdateAlert(updatedCampaign.name, status).catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));
    }

    // If the campaign state was changed to running, trigger background sender
    if (status === 'running') {
      runCampaignSender().catch(err => console.error('[Background Mailer Error] Trigger failed:', err.message));
    }

    res.json(updatedCampaign);
  } catch (error) {
    console.error('[API Campaigns Error] PUT /:id failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/campaigns/:id/start - Start campaign sends
router.post('/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Set status to running
    db.prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(id);

    console.log(`[API Campaigns] Campaign ${id} started. Triggering mailer loop.`);
    
    // Send Discord alert
    sendCampaignUpdateAlert(campaign.name, 'running').catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));

    // Trigger the background mailer asynchronously
    runCampaignSender().catch(err => console.error('[Background Mailer Error] Trigger failed:', err.message));

    res.json({ success: true, status: 'running' });
  } catch (error) {
    console.error('[API Campaigns Error] POST /:id/start failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/campaigns/:id/pause - Pause campaign sends
router.post('/:id/pause', (req, res) => {
  try {
    const { id } = req.params;
    const campaign = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(id);
    
    // Send Discord alert
    sendCampaignUpdateAlert(campaign.name, 'paused').catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));

    res.json({ success: true, status: 'paused' });
  } catch (error) {
    console.error('[API Campaigns Error] POST /:id/pause failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/campaigns/:id/stop - Stop campaign, mark completed
router.post('/:id/stop', (req, res) => {
  try {
    const { id } = req.params;
    const campaign = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    db.prepare("UPDATE campaigns SET status = 'done' WHERE id = ?").run(id);
    
    // Send Discord alert
    sendCampaignUpdateAlert(campaign.name, 'done').catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));

    res.json({ success: true, status: 'done' });
  } catch (error) {
    console.error('[API Campaigns Error] POST /:id/stop failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 7. DELETE /api/campaigns/:id - Delete a campaign
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[API Campaigns Error] DELETE /:id failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
