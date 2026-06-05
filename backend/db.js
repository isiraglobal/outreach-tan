const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'outreach.db');
const db = new Database(dbPath);

// Enable WAL mode for concurrency support
db.pragma('journal_mode = WAL');

// 1. Table: leads
db.prepare(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    company TEXT,
    source TEXT,               -- 'sheet' | 'upload' | 'manual'
    status TEXT DEFAULT 'pending', -- 'pending' | 'queued' | 'sent' | 'replied' | 'bounced' | 'skipped'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// 2. Table: campaigns
db.prepare(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    subject TEXT,
    body_template TEXT,        -- Use {{name}}, {{company}} as placeholders
    status TEXT DEFAULT 'draft', -- 'draft' | 'running' | 'paused' | 'done'
    delay_min INTEGER DEFAULT 60,  -- Min seconds between emails
    delay_max INTEGER DEFAULT 180, -- Max seconds between emails
    daily_limit INTEGER DEFAULT 40,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// 3. Table: sent_emails
db.prepare(`
  CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    campaign_id INTEGER,
    to_email TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_id TEXT,           -- Gmail message ID for threading
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  )
`).run();

// 4. Table: replies
db.prepare(`
  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_email_id INTEGER,
    from_email TEXT,
    subject TEXT,
    snippet TEXT,              -- First 300 chars of reply
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    discord_notified INTEGER DEFAULT 0,
    actioned INTEGER DEFAULT 0,
    FOREIGN KEY (sent_email_id) REFERENCES sent_emails(id) ON DELETE SET NULL
  )
`).run();

// 5. Table: warmup_log
db.prepare(`
  CREATE TABLE IF NOT EXISTS warmup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_to TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT DEFAULT 'warmup'
  )
`).run();

// 6. Table: settings (custom dynamic settings store for persistence)
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

console.log('SQLite database initialized successfully at', dbPath);

module.exports = db;
