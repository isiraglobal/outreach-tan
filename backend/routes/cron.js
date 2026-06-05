const express = require('express');
const router = express.Router();
const { pollInbox } = require('../poller');
const { runCampaignSender } = require('../mailer');
const { syncLeadsFromSheet } = require('../sheets');

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
