const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { sendDiscordAlert } = require('../discord');

const envPath = path.join(__dirname, '../.env');

// Helper to write key-value pairs back to .env file
function updateEnv(key, value) {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;

  if (content.match(regex)) {
    content = content.replace(regex, line);
  } else {
    // Append newline if content doesn't end with one
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += line;
  }

  fs.writeFileSync(envPath, content, 'utf8');
  process.env[key] = value; // Update process.env in-memory immediately
}

// 1. GET /api/settings - Fetch current settings from database + process.env
router.get('/', (req, res) => {
  try {
    const keys = [
      'GMAIL_USER',
      'GMAIL_APP_PASSWORD',
      'DISCORD_WEBHOOK_URL',
      'WARMUP_EMAILS',
      'WARMUP_ENABLED',
      'GOOGLE_SHEET_URL',
      'GOOGLE_SERVICE_ACCOUNT_JSON'
    ];

    const result = {};
    for (const key of keys) {
      const dbRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      result[key] = dbRow ? dbRow.value : (process.env[key] || '');
    }

    res.json(result);
  } catch (error) {
    console.error('[API Settings Error] GET / failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/settings - Save settings to database and .env file
router.post('/', (req, res) => {
  try {
    const settings = req.body;

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    // Run in transaction
    const upsertTransaction = db.transaction((configMap) => {
      for (const [key, val] of Object.entries(configMap)) {
        upsertStmt.run(key, String(val));
        
        // Write to .env file
        try {
          updateEnv(key, String(val));
        } catch (envErr) {
          console.error(`[Settings Error] Failed to write key ${key} to .env:`, envErr.message);
        }
      }
    });

    upsertTransaction(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('[API Settings Error] POST / failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/settings/test-discord - Send test message via Discord webhook
router.post('/test-discord', async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    // Temporarily inject webhook if passed in body, otherwise uses configured
    if (webhookUrl) {
      process.env.DISCORD_WEBHOOK_URL = webhookUrl;
    }

    await sendDiscordAlert({
      from_email: 'test-user@example.com',
      campaign_name: 'System Test Campaign',
      subject: '🔔 Webhook Configuration Test',
      snippet: 'Success! Your Discord bot alert integration is working correctly. Reply notifications will appear here.'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API Settings Error] POST /test-discord failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/settings/reset-database - Danger zone: clear logs or reset lead status
router.post('/reset-database', (req, res) => {
  try {
    const { action } = req.body; // 'clear_logs' or 'reset_leads'

    if (action === 'clear_logs') {
      console.log('[Danger Zone] Clearing all sent emails and replies logs...');
      db.prepare('DELETE FROM replies').run();
      db.prepare('DELETE FROM sent_emails').run();
      db.prepare('DELETE FROM warmup_log').run();
      res.json({ success: true, message: 'Sent logs and replies successfully cleared.' });
    } else if (action === 'reset_leads') {
      console.log('[Danger Zone] Resetting all lead statuses to pending...');
      db.prepare("UPDATE leads SET status = 'pending'").run();
      res.json({ success: true, message: 'All lead statuses reset to pending.' });
    } else {
      res.status(400).json({ error: 'Invalid reset action' });
    }
  } catch (error) {
    console.error('[API Settings Error] POST /reset-database failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
