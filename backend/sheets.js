const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { google } = require('googleapis');
const db = require('./db');

// Helper to get settings dynamically from DB
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : process.env[key];
}

/**
 * Extracts Google Sheet ID from a full Google Sheets URL
 */
function extractSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Mode A: Fetches public sheet CSV and syncs leads to the SQLite database.
 * Runs every 15 minutes or via manual trigger.
 */
async function syncLeadsFromSheet() {
  const sheetUrl = getSetting('GOOGLE_SHEET_URL');
  if (!sheetUrl) {
    console.log('[Sheets Sync] No Google Sheet URL configured. Skipping pull sync.');
    return { success: false, count: 0, error: 'No sheet URL configured' };
  }

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    console.error('[Sheets Sync] Invalid Google Sheet URL format.');
    return { success: false, count: 0, error: 'Invalid URL format' };
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  console.log(`[Sheets Sync] Fetching public sheet leads from: ${csvUrl}`);

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: status ${response.status}`);
    }

    const csvText = await response.text();
    
    // Parse CSV
    const records = parse(csvText, {
      columns: true, // Uses first row as header keys
      skip_empty_lines: true,
      trim: true
    });

    let newLeadsCount = 0;
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO leads (email, name, company, source, status)
      VALUES (?, ?, ?, 'sheet', 'pending')
    `);

    // We look for headers: email (required), name, company
    for (const record of records) {
      // Find keys in case of capitalization mismatch
      const keys = Object.keys(record);
      const emailKey = keys.find(k => k.toLowerCase() === 'email');
      const nameKey = keys.find(k => k.toLowerCase() === 'name');
      const companyKey = keys.find(k => k.toLowerCase() === 'company');

      const email = emailKey ? record[emailKey] : null;
      if (!email || !email.includes('@')) {
        continue; // Skip invalid emails
      }

      const name = nameKey ? record[nameKey] : '';
      const company = companyKey ? record[companyKey] : '';

      const info = insertStmt.run(email, name, company);
      if (info.changes > 0) {
        newLeadsCount++;
      }
    }

    console.log(`[Sheets Sync] Completed pull sync. Added ${newLeadsCount} new leads.`);
    return { success: true, count: newLeadsCount };

  } catch (error) {
    console.error('[Sheets Sync] Mode A pull leads sync failed:', error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Mode B: Pushes single sent email record to a google sheet 'SENT_LOG' sheet/tab
 */
async function pushSentToSheet(sentRecord) {
  const sheetUrl = getSetting('GOOGLE_SHEET_URL');
  const serviceAccountJsonPath = getSetting('GOOGLE_SERVICE_ACCOUNT_JSON') || './service-account.json';
  
  if (!sheetUrl) {
    console.log('[Sheets Sync] No Google Sheet URL configured. Skipping Mode B sent log append.');
    return;
  }

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    console.log('[Sheets Sync] Invalid sheet URL. Skipping Mode B append.');
    return;
  }

  let credsPath = path.isAbsolute(serviceAccountJsonPath) 
    ? serviceAccountJsonPath 
    : path.join(__dirname, serviceAccountJsonPath);

  if (!fs.existsSync(credsPath)) {
    console.log(`[Sheets Sync] Service Account key file not found at ${credsPath}. Skipping Mode B Sent Log append.`);
    return;
  }

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

    const auth = new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Try to append row. Range is 'SENT_LOG!A:F'
    // ValueInputOption: RAW or USER_ENTERED
    const values = [[
      sentRecord.email,
      sentRecord.name || '',
      sentRecord.company || '',
      sentRecord.campaign || '',
      sentRecord.sent_at,
      sentRecord.status
    ]];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'SENT_LOG!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values }
      });
      console.log(`[Sheets Sync] Logged send to ${sentRecord.email} in SENT_LOG sheet.`);
    } catch (appendError) {
      // If the sheet tab 'SENT_LOG' does not exist, let's create it first and add headers
      if (appendError.message.includes('Unable to parse range') || appendError.message.includes('not found')) {
        console.log("[Sheets Sync] Tab 'SENT_LOG' not found. Creating tab and adding headers...");
        
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: 'SENT_LOG' }
              }
            }]
          }
        });

        // Add headers first
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'SENT_LOG!A1:F1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Email', 'Name', 'Company', 'Campaign', 'Sent At', 'Status']]
          }
        });

        // Append the actual record row now
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'SENT_LOG!A:F',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values }
        });
        console.log(`[Sheets Sync] Tab 'SENT_LOG' created and send logged.`);
      } else {
        throw appendError;
      }
    }

  } catch (error) {
    console.error('[Sheets Sync] Mode B push sent log failed:', error.message);
  }
}

module.exports = { syncLeadsFromSheet, pushSentToSheet };
