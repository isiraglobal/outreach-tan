const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const db = require('../db');
const { syncLeadsFromSheet } = require('../sheets');

const upload = multer();

// 1. GET /api/leads - List leads (filter by status, search query)
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM leads';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(email LIKE ? OR name LIKE ? OR company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const leads = db.prepare(query).all(...params);
    res.json(leads);
  } catch (error) {
    console.error('[API Leads Error] GET / failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/leads/import-csv - Upload CSV, parse, and insert leads
router.post('/import-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvText = req.file.buffer.toString('utf8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let newLeadsCount = 0;
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO leads (email, name, company, source, status)
      VALUES (?, ?, ?, 'upload', 'pending')
    `);

    // Insert leads inside a transaction for performance
    const insertTransaction = db.transaction((rows) => {
      for (const row of rows) {
        const keys = Object.keys(row);
        const emailKey = keys.find(k => k.toLowerCase() === 'email');
        const nameKey = keys.find(k => k.toLowerCase() === 'name');
        const companyKey = keys.find(k => k.toLowerCase() === 'company');

        const email = emailKey ? row[emailKey] : null;
        if (!email || !email.includes('@')) continue;

        const name = nameKey ? row[nameKey] : '';
        const company = companyKey ? row[companyKey] : '';

        const info = insertStmt.run(email, name, company);
        if (info.changes > 0) {
          newLeadsCount++;
        }
      }
    });

    insertTransaction(records);

    res.json({ success: true, count: newLeadsCount });
  } catch (error) {
    console.error('[API Leads Error] POST /import-csv failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/leads/sync-sheet - Pull leads from Google Sheet URL
router.post('/sync-sheet', async (req, res) => {
  try {
    const result = await syncLeadsFromSheet();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[API Leads Error] POST /sync-sheet failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. PATCH /api/leads/:id/status - Update single lead status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const info = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[API Leads Error] PATCH /:id/status failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/leads/bulk-status - Queue or Skip multiple leads
router.post('/bulk-status', (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || !status) {
      return res.status(400).json({ error: 'Invalid payload. Expects { ids: number[], status: string }' });
    }

    const updateStmt = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
    const updateTransaction = db.transaction((leadIds) => {
      for (const id of leadIds) {
        updateStmt.run(status, id);
      }
    });

    updateTransaction(ids);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[API Leads Error] POST /bulk-status failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 6. DELETE /api/leads/:id - Delete single lead
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[API Leads Error] DELETE /:id failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/leads/bulk-delete - Delete multiple leads
router.post('/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid payload. Expects { ids: number[] }' });
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE id = ?');
    const deleteTransaction = db.transaction((leadIds) => {
      for (const id of leadIds) {
        deleteStmt.run(id);
      }
    });

    deleteTransaction(ids);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[API Leads Error] POST /bulk-delete failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
