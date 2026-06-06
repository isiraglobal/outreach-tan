const dotenv = require('dotenv');
dotenv.config();

// Helper to get settings dynamically from DB
function getSetting(key) {
  // We require DB dynamically here to avoid circular dependencies during initialization
  const db = require('./db');
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
}

/**
 * Base function to post raw json payload to Discord Webhook
 */
async function postToWebhook(payload) {
  const webhookUrl = getSetting('DISCORD_WEBHOOK_URL');
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.warn('[Discord Warning] Webhook URL is not set or invalid. Skipping Discord post.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Discord Error] Webhook responded with status ${response.status}: ${errorText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Discord Error] Failed to send webhook post:', error.message);
    return false;
  }
}

/**
 * Sends a reply notification embed to Discord.
 * @param {object} reply - from_email, lead_name, lead_company, campaign_name, subject, snippet
 */
async function sendDiscordAlert(reply) {
  const name = reply.lead_name || 'N/A';
  const company = reply.lead_company || 'N/A';
  const email = reply.from_email || 'N/A';
  const subject = reply.subject || 'No Subject';
  const bodyText = reply.snippet || '(No message content)';

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent('Re: ' + subject.replace(/^Re:\s*/i, ''))}`;

  const payload = {
    content: null,
    embeds: [{
      title: '📬 New Lead Reply Received',
      color: 0x00ff88, // Emerald green
      description: `**Message:**\n\`\`\`text\n${bodyText}\n\`\`\``,
      fields: [
        { name: '👤 Lead Name', value: name, inline: true },
        { name: '🏢 Company', value: company, inline: true },
        { name: '✉️ Lead Email', value: email, inline: true },
        { name: '🚀 Campaign', value: reply.campaign_name || 'N/A', inline: true },
        { name: '📝 Subject', value: subject, inline: true },
        { 
          name: '⚡ Quick Actions', 
          value: `👉 **[Reply directly via Email](${mailtoUrl})**\n👉 **[View in Outreach Dashboard](https://outreach-tan-theta.vercel.app/replies)**` 
        }
      ],
      timestamp: new Date().toISOString()
    }]
  };
  return await postToWebhook(payload);
}

/**
 * Sends a campaign status update embed to Discord.
 */
async function sendCampaignUpdateAlert(campaignName, status) {
  let statusEmoji = '⚙️';
  let color = 0x6b5e57; // Muted charcoal brown
  
  if (status === 'running') {
    statusEmoji = '🚀';
    color = 0x9ba77d; // Brand sage green
  } else if (status === 'paused') {
    statusEmoji = '⏸️';
    color = 0xc9b37b; // Brand gold
  } else if (status === 'done') {
    statusEmoji = '✅';
    color = 0x4caf50; // Success green
  }

  const payload = {
    content: null,
    embeds: [{
      title: `${statusEmoji} Campaign Update`,
      description: `Campaign **"${campaignName}"** status has changed.`,
      color: color,
      fields: [
        { name: 'Campaign Name', value: campaignName, inline: true },
        { name: 'Current Status', value: status.toUpperCase(), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };
  return await postToWebhook(payload);
}

/**
 * Sends a general system alert to Discord (e.g. errors, limit caps).
 */
async function sendSystemAlert(title, message, type = 'info') {
  let color = 0x2196f3; // Info blue
  let prefix = 'ℹ️';

  if (type === 'warning') {
    color = 0xffeb3b; // Warning yellow
    prefix = '⚠️';
  } else if (type === 'error') {
    color = 0xf44336; // Error red
    prefix = '🚨';
  } else if (type === 'success') {
    color = 0x4caf50; // Success green
    prefix = '✅';
  }

  const payload = {
    content: null,
    embeds: [{
      title: `${prefix} ${title}`,
      description: message,
      color: color,
      timestamp: new Date().toISOString()
    }]
  };
  return await postToWebhook(payload);
}

module.exports = {
  sendDiscordAlert,
  sendCampaignUpdateAlert,
  sendSystemAlert
};
