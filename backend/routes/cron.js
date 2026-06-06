const express = require('express');
const router = express.Router();
const { pollInbox } = require('../poller');
const { runCampaignSender } = require('../mailer');
const { syncLeadsFromSheet } = require('../sheets');
const nodemailer = require('nodemailer');
const db = require('../db');

// Helper to get a setting value from DB or env
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
}

// 0. POST /api/cron/send-test-email - Send a single test email to verify SMTP credentials
router.post('/send-test-email', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid recipient email address required.' });
    }

    const gmailUser = getSetting('GMAIL_USER');
    const gmailPass = getSetting('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPass) {
      return res.status(400).json({ error: 'Gmail credentials not configured. Go to Settings → Gmail Account.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });

    await transporter.sendMail({
      from: `"Outreach Platform" <${gmailUser}>`,
      to,
      subject: '✅ Outreach Platform – SMTP Test Successful',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9f7f4;border-radius:12px;border:1px solid #e0d8cc">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:36px">⚡</div>
            <h2 style="color:#2C221C;margin:8px 0 4px;font-size:20px">SMTP Connection Verified</h2>
            <p style="color:#5E4E46;font-size:13px;margin:0">Your Gmail account is correctly configured.</p>
          </div>
          <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #e0d8cc;margin-bottom:16px">
            <p style="margin:0 0 8px;font-size:13px;color:#2C221C"><strong>From Account:</strong> ${gmailUser}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#2C221C"><strong>Sent To:</strong> ${to}</p>
            <p style="margin:0;font-size:13px;color:#2C221C"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size:12px;color:#8C7A72;text-align:center;margin:0">
            The Outreach Platform will use this Gmail account to send campaign emails.<br/>
            Emails are only dispatched between 10 AM – 4 PM US Eastern Time.
          </p>
        </div>
      `
    });

    console.log(`[Test Email] Sent to ${to} from ${gmailUser}`);
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    console.error('[Test Email Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 1. GET/POST /api/cron/poll - Manually run or hook cron to poll IMAP replies
router.all('/poll', async (req, res) => {
  console.log('[Manual Trigger] Running IMAP Inbox reply poll...');
  try {
    // Run pollInbox in background or wait for it
    await pollInbox();
    res.json({
      success: true,
      message: 'IMAP inbox reply check executed successfully.'
    });
  } catch (error) {
    console.error('[Manual Trigger Error] IMAP poll failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET/POST /api/cron/send - Trigger campaign mailer queue processing
router.all('/send', (req, res) => {
  console.log('[Manual Trigger] Triggering mailer sender loop...');
  try {
    // runCampaignSender runs asynchronously in the background
    runCampaignSender()
      .then(() => console.log('[Manual Trigger] Background mailer loop completed.'))
      .catch(err => console.error('[Manual Trigger Error] Background mailer execution failed:', err.message));

    res.json({
      success: true,
      message: 'Mailer queue processing triggered in background.'
    });
  } catch (error) {
    console.error('[Manual Trigger Error] Mailer trigger failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. GET/POST /api/cron/sync-sheets - Force pull sync leads from Google Sheet
router.all('/sync-sheets', async (req, res) => {
  console.log('[Manual Trigger] Fetching Google Sheets lead sync...');
  try {
    const result = await syncLeadsFromSheet();
    res.json({
      success: true,
      message: 'Google Sheets sync processed.',
      result
    });
  } catch (error) {
    console.error('[Manual Trigger Error] Google Sheet sync failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET/POST /api/cron/trigger-all - Sequentially run sheet sync, send queue, and inbox poll
router.all('/trigger-all', async (req, res) => {
  console.log('[Manual Trigger] Running combined workflow trigger-all...');
  const logs = [];

  try {
    // A. Sync sheets
    logs.push('1. Starting Google Sheet Sync...');
    const syncRes = await syncLeadsFromSheet();
    logs.push(`   Google Sheet sync completed. Added ${syncRes.count || 0} leads.`);

    // B. Trigger mailer
    logs.push('2. Triggering Mailer Queue processing...');
    runCampaignSender().catch(err => console.error(err));
    logs.push('   Mailer sender loop started asynchronously.');

    // C. Poll replies
    logs.push('3. Running IMAP Inbox reply poll...');
    await pollInbox();
    logs.push('   IMAP Inbox reply check completed.');

    res.json({
      success: true,
      message: 'Combined workflow triggered successfully.',
      steps: logs
    });
  } catch (error) {
    console.error('[Manual Trigger Error] Combined trigger failed:', error.message);
    res.status(500).json({
      error: error.message,
      steps_completed: logs
    });
  }
});

module.exports = router;
