const nodemailer = require('nodemailer');
const db = require('./db');
const { pushSentToSheet } = require('./sheets');

// Helper to get settings dynamically from DB settings table, or fallback to environment variables
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
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
 * Gets count of sent emails today
 */
function getTodaySentCount() {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM sent_emails 
    WHERE DATE(sent_at) = ?
  `).get(today);
  return row ? row.count : 0;
}

/**
 * Checks if the current time in US Eastern Time (America/New_York) is between 10 AM and 4 PM (10:00 - 15:59).
 */
function isWithinSendingWindow() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    return hour >= 10 && hour < 16;
  } catch (err) {
    console.error('[Timezone Check Error] Failed to determine US/Eastern hour:', err.message);
    return true; // Fallback to safe mode if system configuration fails
  }
}

/**
 * Utility function for random delay
 */
function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Global flag to prevent concurrent sender loops
let isSendingInProgress = false;

/**
 * Main campaign sending runner loop.
 * Resolves immediately, but runs campaign email delivery in background.
 */
async function runCampaignSender() {
  if (isSendingInProgress) {
    console.log('[Mailer Info] Sender loop already active. Skipping duplicate run.');
    return;
  }

  isSendingInProgress = true;
  console.log('[Mailer Info] Campaign sender loop started.');

  try {
    while (true) {
      // 1. Find the first running campaign
      const campaign = db.prepare(`
        SELECT * FROM campaigns WHERE status = 'running' LIMIT 1
      `).get();

      if (!campaign) {
        console.log('[Mailer Info] No running campaigns found. Stopping sender loop.');
        break;
      }

      // 2. Check US Eastern Time sending window (10 AM to 4 PM)
      if (!isWithinSendingWindow()) {
        console.log('[Mailer Window] Outside of US Eastern sending window (10 AM - 4 PM). Waiting 5 minutes before checking again...');
        await delay(300); // Sleep for 5 minutes (300 seconds)
        continue;
      }

      // 3. Check daily send limit vs overall today sent count
      const todaySent = getTodaySentCount();
      if (todaySent >= campaign.daily_limit) {
        console.warn(`[Mailer Warning] Daily send limit (${campaign.daily_limit}) reached today (${todaySent} sent). Pausing campaigns.`);
        // Mark running campaigns as paused or keep them running but stop sending for today
        db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(campaign.id);
        
        // Send Discord pause alert & system alert
        const { sendCampaignUpdateAlert, sendSystemAlert } = require('./discord');
        sendCampaignUpdateAlert(campaign.name, 'paused').catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));
        sendSystemAlert('Daily Send Limit Reached', `Campaign **"${campaign.name}"** was paused because the daily limit of **${campaign.daily_limit}** emails was reached.`, 'warning').catch(err => console.error(err));
        break;
      }

      // 3. Get next pending lead for this campaign (or leads that are queued for sending)
      // Note: We need to pull leads with status 'queued' (or queued for this campaign)
      // Let's look for leads with status = 'queued'
      const lead = db.prepare(`
        SELECT * FROM leads WHERE status = 'queued' LIMIT 1
      `).get();

      if (!lead) {
        console.log(`[Mailer Info] No queued leads found. Campaign '${campaign.name}' marked completed.`);
        db.prepare("UPDATE campaigns SET status = 'done' WHERE id = ?").run(campaign.id);
        
        // Send Discord done alert
        const { sendCampaignUpdateAlert } = require('./discord');
        sendCampaignUpdateAlert(campaign.name, 'done').catch(err => console.error('[Discord Alert Error] Status post failed:', err.message));
        continue;
      }

      // 4. Level 2 Pre-send Deduplication Check
      const alreadySent = db.prepare(`
        SELECT id FROM sent_emails WHERE to_email = ? AND campaign_id = ?
      `).get(lead.email, campaign.id);

      if (alreadySent) {
        console.log(`[Mailer Deduplication] Already sent to ${lead.email} for campaign ${campaign.id}. Skipping.`);
        db.prepare("UPDATE leads SET status = 'skipped' WHERE id = ?").run(lead.id);
        continue;
      }

      // 5. Build email template variables
      const leadName = lead.name || 'there';
      const leadCompany = lead.company || 'your company';

      // Template interpolation
      let subject = campaign.subject || '';
      let body = campaign.body_template || '';

      // Template interpolation
      subject = subject
        .replace(/\{\{name\}\}/gi, leadName)
        .replace(/\{\{company\}\}/gi, leadCompany)
        .replace(/\{\{email\}\}/gi, lead.email || '');
      body = body
        .replace(/\{\{name\}\}/gi, leadName)
        .replace(/\{\{company\}\}/gi, leadCompany)
        .replace(/\{\{email\}\}/gi, lead.email || '');

      // Auto-detect HTML vs plain-text template
      const isHtml = /<[a-z][\s\S]*>/i.test(body);

      let htmlBody, textBody;
      if (isHtml) {
        // HTML email: append styled unsubscribe footer
        htmlBody = body + `
          <br/><br/>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-size:11px;color:#aaa;text-align:center">
            You are receiving this because you are in our outreach list.<br/>
            To unsubscribe, reply with STOP in the subject line.
          </p>
        `;
        // Plain-text fallback: strip HTML tags
        textBody = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() +
          '\n\n---\nTo unsubscribe, reply STOP.';
      } else {
        // Plain text email: append simple footer
        textBody = body + '\n\n---\nTo stop receiving emails, reply with STOP.';
        htmlBody = null;
      }

      // 6. Attempt email sending via Nodemailer
      let transporter;
      try {
        transporter = createTransporter();
      } catch (err) {
        console.error('[Mailer Error] Failed to create transporter:', err.message);
        db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(campaign.id);
        break;
      }

      const senderEmail = getSetting('GMAIL_USER');
      console.log(`[Mailer Info] Sending ${isHtml ? 'HTML' : 'plain text'} email to ${lead.email} for campaign '${campaign.name}'...`);

      try {
        const mailOptions = {
          from: `"Outreach" <${senderEmail}>`,
          to: lead.email,
          subject: subject,
          text: textBody
        };
        if (htmlBody) mailOptions.html = htmlBody;

        const info = await transporter.sendMail(mailOptions);

        console.log(`[Mailer Info] Email sent successfully to ${lead.email}. Message ID: ${info.messageId}`);

        // Update database: lead status = 'sent'
        db.prepare("UPDATE leads SET status = 'sent' WHERE id = ?").run(lead.id);

        // Record in sent_emails
        db.prepare(`
          INSERT INTO sent_emails (lead_id, campaign_id, to_email, subject, body, message_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(lead.id, campaign.id, lead.email, subject, body, info.messageId);

        // Mode B Google Sheets: Push sent info
        try {
          await pushSentToSheet({
            email: lead.email,
            name: lead.name,
            company: lead.company,
            campaign: campaign.name,
            sent_at: new Date().toISOString(),
            status: 'sent'
          });
        } catch (sheetErr) {
          console.error('[Mailer Sheets Error] Failed to log sent data to Google Sheets:', sheetErr.message);
        }

      } catch (sendErr) {
        console.error(`[Mailer Error] Failed to send email to ${lead.email}:`, sendErr.message);
        
        // Check if bounce or SMTP auth error
        db.prepare("UPDATE leads SET status = 'bounced' WHERE id = ?").run(lead.id);

        // If credentials error, pause campaign
        if (sendErr.message.includes('Invalid login') || sendErr.message.includes('Username and Password not accepted')) {
          console.error('[Mailer Error] SMTP Auth failure. Pausing campaigns.');
          db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(campaign.id);
          break;
        }
      }

      // 7. Enforce configurable random delay between sends (min and max seconds)
      const delayMin = campaign.delay_min || 60;
      const delayMax = campaign.delay_max || 180;
      const randDelay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
      console.log(`[Mailer Info] Waiting ${randDelay} seconds before next send...`);
      await delay(randDelay);
    }
  } catch (err) {
    console.error('[Mailer Fatal Error] Unexpected error in sender loop:', err);
  } finally {
    isSendingInProgress = false;
    console.log('[Mailer Info] Campaign sender loop terminated.');
  }
}

module.exports = { runCampaignSender, createTransporter, getSetting };
