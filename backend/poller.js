const { ImapFlow } = require('imapflow');
const cron = require('node-cron');
const db = require('./db');
const { sendDiscordAlert } = require('./discord');

// Helper to get settings dynamically from DB
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
}

/**
 * Extracts a plain text snippet of up to 300 characters from raw email source,
 * cleaning out HTML tags and removing previous email thread history (quote replies).
 */
function getPlainBodySnippet(sourceText) {
  if (!sourceText) return '';
  
  // Find where the headers end and body begins
  const doubleNewlineIndex = sourceText.indexOf('\r\n\r\n');
  let body = doubleNewlineIndex !== -1 ? sourceText.substring(doubleNewlineIndex + 4) : sourceText;

  // Remove common HTML elements, maintaining newlines for split lines parsing
  body = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n') // turn breaks into newlines
    .replace(/<\/p>/gi, '\n')      // turn paragraph ends into newlines
    .replace(/<[^>]+>/g, ' ')      // strip html tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');

  // Strip MIME boundaries, headers inside multipart bodies, etc.
  body = body.replace(/Content-Type:[\s\S]*?(\r?\n){2}/gi, '');
  body = body.replace(/Content-Transfer-Encoding:[\s\S]*?(\r?\n){2}/gi, '');
  body = body.replace(/--[a-zA-Z0-9'"+,./:?=-]+/g, ''); // boundary delimiters
  
  // Split into lines to extract actual response body and drop email thread logs
  const lines = body.split(/\r?\n/);
  const cleanedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Stop as soon as we detect quote headers or split dividers
    if (
      trimmed.startsWith('>') || 
      trimmed.match(/^on\s+.*wrote:$/i) || 
      trimmed.match(/^from:/i) || 
      trimmed.match(/^to:/i) || 
      trimmed.match(/^subject:/i) || 
      trimmed.match(/^sent:/i) || 
      trimmed.startsWith('-----Original Message-----') ||
      trimmed.startsWith('________________________________') ||
      trimmed.match(/^am\s+.*schrieb:$/i) || 
      trimmed.match(/^le\s+.*a\s+écrit:$/i)
    ) {
      break;
    }
    
    // Skip empty lines at the very beginning
    if (cleanedLines.length === 0 && trimmed === '') {
      continue;
    }
    
    cleanedLines.push(line.trim());
  }

  // Join back and collapse spaces
  let resultText = cleanedLines.join('\n').replace(/[ \t]+/g, ' ').trim();

  return resultText.substring(0, 300);
}

/**
 * Clean up angle brackets and whitespaces from message IDs
 */
function cleanMessageId(msgId) {
  if (!msgId) return '';
  return msgId.trim().replace(/^</, '').replace(/>$/, '');
}

/**
 * Polls Gmail inbox for new replies and notifies via Discord
 */
async function pollInbox() {
  const user = getSetting('GMAIL_USER');
  const pass = (getSetting('GMAIL_APP_PASSWORD') || '').replace(/\s/g, '');

  if (!user || !pass) {
    console.log('[Poller Info] Gmail credentials are not configured. Skipping IMAP polling.');
    return;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    logger: false,
    auth: { user, pass }
  });

  // Prevent socket errors or timeouts from causing unhandled exceptions that crash the server
  client.on('error', err => {
    console.error('[IMAP Socket Error] Caught asynchronous connection error:', err.message);
  });

  console.log('[Poller Info] Connecting to imap.gmail.com...');
  try {
    await client.connect();

    // Select INBOX
    let lock = await client.getMailboxLock('INBOX');
    try {
      console.log('[Poller Info] Checking for UNSEEN messages...');
      
      // Fetch unseen messages envelope, raw headers, and source
      const messages = client.fetch({ seen: false }, { 
        envelope: true, 
        source: true,
        uid: true
      });

      for await (let message of messages) {
        const fromAddrObj = message.envelope.from && message.envelope.from[0];
        const fromEmail = fromAddrObj ? fromAddrObj.address : '';
        const fromName = fromAddrObj ? fromAddrObj.name : '';
        const subject = message.envelope.subject || '';
        const messageId = cleanMessageId(message.envelope.messageId);
        const inReplyTo = cleanMessageId(message.envelope.inReplyTo);
        
        console.log(`[Poller Info] Unread message from ${fromEmail}: "${subject}" (Message-ID: ${messageId})`);

        // Get plain text body snippet
        const rawSource = message.source ? message.source.toString('utf8') : '';
        const snippet = getPlainBodySnippet(rawSource);

        // Try to match the reply to a sent email in our database
        let matchedSentEmail = null;

        // Step A: Match by In-Reply-To
        if (inReplyTo) {
          matchedSentEmail = db.prepare(`
            SELECT * FROM sent_emails WHERE message_id = ? OR message_id LIKE ? LIMIT 1
          `).get(inReplyTo, `%${inReplyTo}%`);
        }

        // Step B: Fallback match by Sender Email
        if (!matchedSentEmail && fromEmail) {
          matchedSentEmail = db.prepare(`
            SELECT * FROM sent_emails 
            WHERE to_email = ? 
            ORDER BY sent_at DESC 
            LIMIT 1
          `).get(fromEmail);
        }

        if (matchedSentEmail) {
          console.log(`[Poller Match] Matched reply from ${fromEmail} to sent email ID ${matchedSentEmail.id}`);

          // Insert reply into replies table (prevent duplicates)
          const existingReply = db.prepare(`
            SELECT id FROM replies WHERE sent_email_id = ? AND received_at >= datetime('now', '-5 minutes') LIMIT 1
          `).get(matchedSentEmail.id);

          if (!existingReply) {
            const result = db.prepare(`
              INSERT INTO replies (sent_email_id, from_email, subject, snippet)
              VALUES (?, ?, ?, ?)
            `).run(matchedSentEmail.id, fromEmail, subject, snippet);

            const replyId = result.lastInsertRowid;

            // Fetch campaign info for notifications
            const campaign = db.prepare(`
              SELECT name FROM campaigns WHERE id = ?
            `).get(matchedSentEmail.campaign_id);

            const campaignName = campaign ? campaign.name : 'Unknown Campaign';

            // Check for unsubscribe trigger keywords
            const lowerSnippet = snippet.toLowerCase();
            const lowerSubject = subject.toLowerCase();
            const isUnsubscribe = ['stop', 'unsubscribe', 'remove me', 'remove'].some(kw => 
              lowerSnippet.includes(kw) || lowerSubject.includes(kw)
            );

            if (isUnsubscribe) {
              console.log(`[Poller Unsubscribe] Unsubscribe keyword detected in reply from ${fromEmail}. Setting status to skipped.`);
              db.prepare(`
                UPDATE leads SET status = 'skipped' WHERE email = ?
              `).run(fromEmail);
            } else {
              // Update lead status to 'replied'
              db.prepare(`
                UPDATE leads SET status = 'replied' WHERE email = ?
              `).run(fromEmail);
            }

            // Fetch lead details for Discord alerts
            const lead = db.prepare('SELECT * FROM leads WHERE email = ?').get(fromEmail) || {};

            // Send Discord Webhook embed alert with contact details
            try {
              await sendDiscordAlert({
                from_email: fromEmail,
                lead_name: lead.name,
                lead_company: lead.company,
                campaign_name: campaignName,
                subject: subject,
                snippet: snippet
              });
              
              // Mark notified
              db.prepare(`UPDATE replies SET discord_notified = 1 WHERE id = ?`).run(replyId);
            } catch (discordErr) {
              console.error('[Poller Discord Error] Failed to send webhook alert:', discordErr.message);
            }
          }
        } else {
          console.log(`[Poller Match] Unseen email from ${fromEmail} did not match any sent campaigns. Skipping.`);
        }

        // Mark the email as read/seen in Gmail
        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
        console.log(`[Poller Info] Marked message UID ${message.uid} as SEEN.`);
      }

    } finally {
      lock.release();
    }

    await client.logout();
    console.log('[Poller Info] Connection closed.');
  } catch (error) {
    console.error('[Poller Error] Inbox polling failed:', error.message);
  }
}

/**
 * Initializes Node-Cron scheduler for Inbox Polling
 * Runs every 5 minutes
 */
function initInboxPollerScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Poller Cron] Running scheduled inbox check...');
    await pollInbox();
  });
  console.log('[Poller Info] Inbox reply poller scheduler cron initialized for every 5 minutes.');
}

module.exports = { initInboxPollerScheduler, pollInbox };
