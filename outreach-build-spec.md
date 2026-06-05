# OUTREACH — Full Build Specification
> AI-independent bulk email outreach platform with Gmail integration, Google Sheets sync, Discord alerts, and internal database tracking.

---

## 0. PROJECT OVERVIEW

**Name:** Outreach  
**Stack:** React (frontend) + Node.js/Express (backend) + SQLite or PostgreSQL (database)  
**No AI APIs used anywhere.** All logic is rule-based.  
**Deployment target:** Single VPS (Railway, Render, or self-hosted) — always-on process via PM2.

### Core Capabilities
- Send bulk emails via Gmail (App Password / 16-char string auth)
- Warm up the sending account automatically (anti-spam)
- Poll Gmail inbox for replies and summarize them
- Push reply summaries to a Discord channel via webhook
- Import leads from Google Sheets or manual CSV upload
- Internal SQLite database tracks every email: sent, replied, bounced, status
- Post-send deduplication — never email the same address twice
- Dashboard showing live stats, queue, sent log, reply log

---

## 1. AUTHENTICATION — GMAIL APP PASSWORD

The user provides a **16-character Gmail App Password** (not the account password). This is generated from Google Account → Security → 2-Step Verification → App Passwords.

### How to store it
```
backend/.env
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← the 16-digit string (spaces OK)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### How to use it (Nodemailer)
```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
  }
});
```

> The frontend has a Settings page where the user can paste these values. They are saved to the backend `.env` and never exposed to the client.

---

## 2. FOLDER STRUCTURE

```
outreach/
├── frontend/               # React app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Leads.jsx
│   │   │   ├── Campaigns.jsx
│   │   │   ├── SentLog.jsx
│   │   │   ├── Replies.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
│
├── backend/                # Node.js + Express
│   ├── index.js            # Entry point
│   ├── db.js               # SQLite setup
│   ├── mailer.js           # Nodemailer send logic
│   ├── warmup.js           # Warmup scheduler
│   ├── poller.js           # Gmail inbox polling
│   ├── discord.js          # Discord webhook poster
│   ├── sheets.js           # Google Sheets sync
│   ├── routes/
│   │   ├── leads.js
│   │   ├── campaigns.js
│   │   ├── emails.js
│   │   └── settings.js
│   ├── .env
│   └── package.json
│
└── ecosystem.config.js     # PM2 config (always-on)
```

---

## 3. DATABASE SCHEMA (SQLite via `better-sqlite3`)

### Table: `leads`
```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  source TEXT,               -- 'sheet' | 'upload' | 'manual'
  status TEXT DEFAULT 'pending', -- 'pending' | 'queued' | 'sent' | 'replied' | 'bounced' | 'skipped'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `sent_emails`
```sql
CREATE TABLE sent_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  campaign_id INTEGER,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_id TEXT,           -- Gmail message ID for threading
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

### Table: `replies`
```sql
CREATE TABLE replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_email_id INTEGER,
  from_email TEXT,
  subject TEXT,
  snippet TEXT,              -- First 300 chars of reply
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  discord_notified INTEGER DEFAULT 0,
  FOREIGN KEY (sent_email_id) REFERENCES sent_emails(id)
);
```

### Table: `campaigns`
```sql
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  subject TEXT,
  body_template TEXT,        -- Use {{name}}, {{company}} as placeholders
  status TEXT DEFAULT 'draft', -- 'draft' | 'running' | 'paused' | 'done'
  delay_min INTEGER DEFAULT 60,  -- Min seconds between emails
  delay_max INTEGER DEFAULT 180, -- Max seconds between emails
  daily_limit INTEGER DEFAULT 40,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `warmup_log`
```sql
CREATE TABLE warmup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_to TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT DEFAULT 'warmup'
);
```

---

## 4. EMAIL SENDING ENGINE (`mailer.js`)

### Logic
1. Pull all leads with `status = 'queued'` for the active campaign
2. Check daily send count — if >= `daily_limit`, stop for the day
3. For each lead:
   - Replace `{{name}}` and `{{company}}` in template
   - Send via Nodemailer
   - On success: insert row into `sent_emails`, update lead `status = 'sent'`
   - On failure/bounce: update lead `status = 'bounced'`, log error
   - Wait random delay between `delay_min` and `delay_max` seconds
4. After sending, move lead to a **"Sent" sheet** in Google Sheets (see §7)

### Random delay function
```js
function randomDelay(min, max) {
  const ms = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Daily send cap enforcement
```js
function getTodaySentCount(db) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(
    `SELECT COUNT(*) as count FROM sent_emails WHERE DATE(sent_at) = ?`
  ).get(today).count;
}
```

---

## 5. WARMUP SYSTEM (`warmup.js`)

Keeps the Gmail account healthy and out of spam by sending small warmup emails on a schedule.

### Strategy
- Send 2–5 warmup emails per day to a **fixed list of warmup addresses** (user-owned addresses or teammates)
- Subject lines rotate from a pool of ~10 natural-sounding subjects
- Body is short conversational text (no links, no images)
- Log every warmup send to `warmup_log` table
- Warmup runs on a separate cron: every day at 9am and 2pm

### Warmup address list (stored in `.env`)
```
WARMUP_EMAILS=friend1@gmail.com,friend2@gmail.com,yourotheremail@gmail.com
```

### Warmup scheduler
```js
// Uses node-cron
cron.schedule('0 9,14 * * *', async () => {
  const warmupAddresses = process.env.WARMUP_EMAILS.split(',');
  const count = Math.floor(Math.random() * 3) + 2; // 2-4 emails
  const targets = warmupAddresses.sort(() => 0.5 - Math.random()).slice(0, count);
  for (const addr of targets) {
    await sendWarmupEmail(addr);
    await randomDelay(120, 300);
  }
});
```

---

## 6. INBOX POLLING — REPLY DETECTION (`poller.js`)

### Tool: `imapflow` (npm package)

Every **5 minutes**, the backend polls Gmail IMAP for new unread emails in the inbox.

### Flow
1. Connect to `imap.gmail.com:993` using IMAP + App Password
2. Search for UNSEEN emails since last poll timestamp
3. For each new email:
   - Match `In-Reply-To` or `References` header to a `message_id` in `sent_emails`
   - If match found: insert into `replies` table
   - Extract `from`, `subject`, `snippet` (first 300 chars of body)
   - Mark email as seen
   - Trigger Discord notification (§8)
4. Update last poll timestamp in a config file or DB

### IMAP config
```js
const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
  }
});
```

### Polling scheduler
```js
// Poll every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await pollInbox();
});
```

---

## 7. GOOGLE SHEETS SYNC (`sheets.js`)

### Two modes

**Mode A — Pull leads from Sheet**
- User pastes their Google Sheet URL in Settings
- Sheet must be publicly readable (or use Service Account for private)
- Backend fetches the sheet as CSV via the public export URL:
  ```
  https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
  ```
- Parse CSV, insert new rows into `leads` table (skip duplicates by email)
- Runs every 15 minutes via cron

**Mode B — Push sent data to Sheet**
- After each email send, append a row to a **"Sent Log" sheet** via Google Sheets API
- Row contains: email, name, company, campaign, sent_at, status
- Uses a Service Account JSON key (user uploads this in Settings)
- Separate tab called `SENT_LOG` is auto-created if it doesn't exist

### Duplicate prevention
```js
// Before inserting any lead
const existing = db.prepare('SELECT id FROM leads WHERE email = ?').get(email);
if (existing) continue; // Skip — already in DB
```

---

## 8. DISCORD NOTIFICATIONS (`discord.js`)

When a reply is detected, send a Discord webhook message within 60 seconds.

### Message format
```
📬 **New Reply Received**

**From:** john@company.com
**Name:** John Smith
**Campaign:** Q2 Outreach
**Subject:** Re: Partnership opportunity
**Preview:** "Hi, thanks for reaching out. We'd be open to a call..."

**Action needed:**
→ Reply within the hour
→ Check CRM and log the conversation
→ Mark as qualified/unqualified

[View in Outreach Dashboard](http://your-dashboard-url/replies)
```

### Send function
```js
async function sendDiscordAlert(reply) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: null,
      embeds: [{
        title: '📬 New Reply Received',
        color: 0x00ff88,
        fields: [
          { name: 'From', value: reply.from_email, inline: true },
          { name: 'Campaign', value: reply.campaign_name, inline: true },
          { name: 'Subject', value: reply.subject },
          { name: 'Preview', value: reply.snippet },
          { name: '⚡ Action', value: '→ Reply within the hour\n→ Log in CRM\n→ Mark qualified/unqualified' }
        ],
        timestamp: new Date().toISOString()
      }]
    })
  });
}
```

---

## 9. FRONTEND PAGES

### 9.1 Dashboard (`/`)
- Cards: Total Leads, Emails Sent Today, Replies, Bounce Rate
- Chart: Sends per day (last 7 days) — use recharts or Chart.js
- Active campaign status + pause/resume button
- Recent replies list (last 5)
- Warmup status indicator (green = active)

### 9.2 Leads (`/leads`)
- Table: email, name, company, status, source, created_at
- Status badge: pending (grey), queued (blue), sent (green), replied (teal), bounced (red), skipped (yellow)
- Bulk actions: Queue selected, Skip selected, Delete selected
- Import button → opens modal with two options:
  - **Upload CSV** (columns: email, name, company)
  - **Sync from Google Sheet** (paste URL → fetch now)
- Search and filter by status

### 9.3 Campaigns (`/campaigns`)
- List of campaigns with status badges
- Create/Edit campaign form:
  - Name
  - Subject line
  - Body (textarea with `{{name}}` and `{{company}}` hint)
  - Delay range (min/max seconds between sends)
  - Daily send limit
- Start / Pause / Stop buttons per campaign
- Preview: shows what the email looks like with sample data

### 9.4 Sent Log (`/sent`)
- Full table of every sent email
- Columns: to, name, campaign, subject, sent_at, status (sent / replied / bounced)
- Filter by campaign, date range, status
- Export as CSV button

### 9.5 Replies (`/replies`)
- Table: from, subject, snippet, received_at, discord_notified
- Click row → expand full reply text
- Mark as actioned checkbox
- Discord re-notify button (resend alert for a specific reply)

### 9.6 Settings (`/settings`)
- Gmail: User email + App Password (masked input, Save button)
- Warmup: Toggle on/off, warmup email addresses (comma-separated)
- Google Sheets: Paste Sheet URL, upload Service Account JSON
- Discord: Paste webhook URL, Test button (sends test message)
- Danger zone: Clear all sent log, Reset all lead statuses

---

## 10. DEDUPLICATION SYSTEM

Three levels of protection against double-sending:

**Level 1 — Database unique constraint**
```sql
email TEXT UNIQUE NOT NULL  -- in leads table
```

**Level 2 — Pre-send check**
```js
// Before sending, always re-verify
const alreadySent = db.prepare(
  `SELECT id FROM sent_emails WHERE to_email = ? AND campaign_id = ?`
).get(email, campaignId);
if (alreadySent) {
  db.prepare(`UPDATE leads SET status = 'skipped' WHERE email = ?`).run(email);
  continue;
}
```

**Level 3 — Google Sheets post-send tab**
- After any email sends, it is moved from the main leads tab to a `SENT_LOG` tab
- If user re-imports the sheet, any email already in `sent_emails` DB is ignored at import time

---

## 11. ALWAYS-ON PROCESS (PM2)

### `ecosystem.config.js`
```js
module.exports = {
  apps: [{
    name: 'outreach-backend',
    script: './backend/index.js',
    watch: false,
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Commands
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # auto-restart on server reboot
```

---

## 12. ANTI-SPAM RULES (ENFORCED IN CODE)

| Rule | Implementation |
|------|----------------|
| Max 40 emails/day | `daily_limit` field in campaign, checked before each send |
| Random delay between sends | 60–180 seconds by default, configurable |
| Warmup sends daily | 2–5 small conversational emails to safe addresses |
| No links in warmup emails | Warmup body template contains no URLs |
| Unsubscribe handling | Any reply containing "unsubscribe" auto-sets lead status to `skipped` |
| No mass sends on weekends | Optional setting: `weekdays_only` toggle |
| Gmail SMTP rate limit respect | Nodemailer queue processes one at a time, never parallel sends |

---

## 13. BACKEND API ROUTES

```
GET    /api/leads                  → list leads (filter by status, search)
POST   /api/leads/import-csv       → upload CSV, parse, insert leads
POST   /api/leads/sync-sheet       → pull from Google Sheet URL
PATCH  /api/leads/:id/status       → update single lead status
DELETE /api/leads/:id              → delete lead

GET    /api/campaigns              → list campaigns
POST   /api/campaigns              → create campaign
PUT    /api/campaigns/:id          → update campaign
POST   /api/campaigns/:id/start    → start sending
POST   /api/campaigns/:id/pause    → pause sending
POST   /api/campaigns/:id/stop     → stop and mark done

GET    /api/sent                   → sent log (paginated)
GET    /api/replies                → replies list
POST   /api/replies/:id/notify     → re-send discord alert

GET    /api/stats                  → dashboard numbers
POST   /api/settings               → save Gmail, Discord, Sheets config
POST   /api/settings/test-discord  → send test Discord message
```

---

## 14. NPM PACKAGES

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "nodemailer": "^6.9.0",
    "imapflow": "^1.0.0",
    "better-sqlite3": "^9.0.0",
    "node-cron": "^3.0.0",
    "dotenv": "^16.0.0",
    "csv-parse": "^5.0.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "googleapis": "^130.0.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "recharts": "^2.0.0",
    "axios": "^1.0.0",
    "papaparse": "^5.0.0"
  }
}
```

---

## 15. BUILD ORDER (for AI agent)

Follow this exact order to avoid dependency issues:

1. **`backend/db.js`** — SQLite setup, create all tables
2. **`backend/.env`** — environment variable template
3. **`backend/mailer.js`** — Nodemailer send + queue logic
4. **`backend/warmup.js`** — warmup scheduler
5. **`backend/poller.js`** — IMAP polling loop
6. **`backend/discord.js`** — webhook sender
7. **`backend/sheets.js`** — CSV fetch + Sheets API push
8. **`backend/routes/`** — all 4 route files
9. **`backend/index.js`** — mount routes, start crons, listen on port
10. **`ecosystem.config.js`** — PM2 config
11. **`frontend/src/pages/Dashboard.jsx`** — stats + charts
12. **`frontend/src/pages/Leads.jsx`** — lead table + import modal
13. **`frontend/src/pages/Campaigns.jsx`** — campaign CRUD
14. **`frontend/src/pages/SentLog.jsx`** — sent emails table
15. **`frontend/src/pages/Replies.jsx`** — reply viewer
16. **`frontend/src/pages/Settings.jsx`** — config form
17. **`frontend/src/App.jsx`** — router setup
18. **Wire frontend to backend** — all axios calls to `/api/*`
19. **Test end-to-end**: import CSV → create campaign → start → verify send → verify poll → verify Discord

---

## 16. ENVIRONMENT VARIABLES REFERENCE

```env
# Gmail
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXXX/YYYYY

# Warmup
WARMUP_EMAILS=email1@gmail.com,email2@gmail.com

# Google Sheets (optional)
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/...
GOOGLE_SERVICE_ACCOUNT_JSON=./service-account.json

# App
PORT=3001
NODE_ENV=production
```

---

## 17. NOTES FOR THE AGENT

- **No AI API is used anywhere.** All summarization, deduplication, and logic is pure code.
- The Discord message is a pre-formatted template, not AI-generated.
- Gmail App Password replaces OAuth — no browser login needed, always-on compatible.
- SQLite is fine for up to ~100k leads. Switch to PostgreSQL if scaling beyond that.
- Frontend talks to backend on `http://localhost:3001` in dev; use env var `REACT_APP_API_URL` for production.
- Warmup and polling run as background crons inside the same Node process — no separate workers needed.
- All emails sent should include a plain-text unsubscribe line at the bottom: `"To stop receiving emails, reply with STOP."`
- Replies containing "STOP", "unsubscribe", or "remove me" should auto-update lead status to `skipped` in the DB.
```
