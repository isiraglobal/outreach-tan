const cron = require('node-cron');
const db = require('./db');
const nodemailer = require('nodemailer');

// Helper to get settings dynamically from DB
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
}

const WARMUP_SUBJECTS = [
  'Quick question',
  'Thoughts on team size?',
  'Nice meeting you last week',
  'Coffee next Tuesday?',
  'Quick check in',
  'Collaboration idea',
  'Hey, simple question',
  'Feedback on your recent post',
  'Catching up soon',
  'Sync next week?'
];

const WARMUP_BODIES = [
  'Hey, just wanted to reach out and see how things are going on your end. Let me know when you have a free moment.',
  'Hi there! Hope you are having a productive week. Just dropping by to say hello and see what you have been working on lately.',
  'Hey, I read your recent update and found it super interesting. Let\'s catch up sometime soon.',
  'Hi, quick question - did you have a chance to look over that discussion from yesterday? No rush at all.',
  'Hello! Hope your day is going well. Just wanted to see if we are still on for a chat next week. Let me know what works.',
  'Hey there. Just wrapping up some project plans for this quarter and thought I would check in. Hope all is well!',
  'Quick question, are you guys planning to attend the upcoming webinar? Let me know, maybe we can connect.',
  'Hi, wanted to say congrats on the recent milestone. Really awesome to see the progress.',
  'Hey! Hope you\'re doing great. Just had a quick thought about our sync next week, let me know if the time still works.',
  'Hello, just wanted to check if you had any suggestions on the shared doc. Thanks!'
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates Nodemailer Transporter with current settings
 */
function createTransporter() {
  const user = getSetting('GMAIL_USER');
  const pass = (getSetting('GMAIL_APP_PASSWORD') || '').replace(/\s/g, '');

  if (!user || !pass) {
    throw new Error('Gmail credentials are not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in settings or .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

/**
 * Sends a single warmup email to target address
 */
async function sendWarmupEmail(toAddress) {
  const senderEmail = getSetting('GMAIL_USER');
  if (!senderEmail) {
    console.error('[Warmup Error] GMAIL_USER is not configured. Warmup email aborted.');
    return;
  }

  try {
    const transporter = createTransporter();
    
    // Choose random subject and body
    const subject = WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)];
    const body = WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)];

    console.log(`[Warmup Info] Sending warmup email to ${toAddress}...`);
    
    await transporter.sendMail({
      from: `"Outreach Warmup" <${senderEmail}>`,
      to: toAddress,
      subject: subject,
      text: body // No links, no images for anti-spam health
    });

    // Log to DB
    db.prepare(`
      INSERT INTO warmup_log (sent_to, type)
      VALUES (?, 'warmup')
    `).run(toAddress);

    console.log(`[Warmup Info] Warmup email logged for ${toAddress}`);
  } catch (error) {
    console.error(`[Warmup Error] Failed to send warmup to ${toAddress}:`, error.message);
  }
}

/**
 * Run manual warmup sequence (e.g. from UI testing)
 */
async function triggerManualWarmup() {
  const warmupEmailsStr = getSetting('WARMUP_EMAILS') || '';
  const warmupAddresses = warmupEmailsStr.split(',').map(e => e.trim()).filter(Boolean);

  if (warmupAddresses.length === 0) {
    console.log('[Warmup Info] No warmup addresses configured. Skipping warmup.');
    return;
  }

  const count = Math.floor(Math.random() * 2) + 1; // 1-2 emails for manual check
  const targets = warmupAddresses.sort(() => 0.5 - Math.random()).slice(0, count);

  for (const addr of targets) {
    await sendWarmupEmail(addr);
    await delay(5000); // short delay
  }
}

/**
 * Initializes Node-Cron scheduler for Warmup emails
 * Scheduled for twice daily: 9:00 AM and 2:00 PM (14:00)
 */
function initWarmupScheduler() {
  // Check if warmup is enabled
  const warmupEnabled = getSetting('WARMUP_ENABLED') !== 'false';
  if (!warmupEnabled) {
    console.log('[Warmup Info] Warmup cron scheduler is disabled by settings.');
  }

  // Hourly cron schedule to evaluate timezone-aligned execution
  cron.schedule('0 * * * *', async () => {
    const isEnabled = getSetting('WARMUP_ENABLED') !== 'false';
    if (!isEnabled) {
      return;
    }

    // Determine current hour in US Eastern Time
    let usHour = null;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        hour12: false
      });
      usHour = parseInt(formatter.format(new Date()), 10);
    } catch (err) {
      console.error('[Warmup Timezone Error] Failed to format US/Eastern hour:', err.message);
      // Fallback: use local server hours if formatter fails
      const localHour = new Date().getHours();
      if (localHour === 9 || localHour === 14) {
        usHour = localHour === 9 ? 10 : 14; 
      }
    }

    // Enforce sends only at 10:00 AM and 2:00 PM US Eastern Time (America/New_York)
    if (usHour !== 10 && usHour !== 14) {
      return;
    }

    const warmupEmailsStr = getSetting('WARMUP_EMAILS') || '';
    const warmupAddresses = warmupEmailsStr.split(',').map(e => e.trim()).filter(Boolean);

    if (warmupAddresses.length === 0) {
      console.log('[Warmup Info] No warmup addresses configured. Skipping.');
      return;
    }

    // Send 2-4 emails
    const count = Math.floor(Math.random() * 3) + 2;
    const targets = warmupAddresses.sort(() => 0.5 - Math.random()).slice(0, count);

    console.log(`[Warmup Cron] Triggered at ${usHour}:00 US Eastern. Sending ${targets.length} warmup emails...`);

    for (const addr of targets) {
      await sendWarmupEmail(addr);
      
      // Delay 2 to 5 minutes between warmup emails to look natural
      const delaySec = Math.floor(Math.random() * 181) + 120; // 120-300 seconds
      console.log(`[Warmup Cron] Waiting ${delaySec} seconds before next warmup send...`);
      await delay(delaySec * 1000);
    }
  });

  console.log('[Warmup Info] Warmup scheduler cron initialized to run hourly, executing sends at 10:00 AM and 2:00 PM US Eastern Time.');
}

module.exports = { initWarmupScheduler, triggerManualWarmup, sendWarmupEmail };
