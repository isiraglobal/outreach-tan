const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

const { restoreDatabase, startBackupScheduler, backupDatabase } = require('./r2-sync');

async function startServer() {
  // 1. Restore SQLite database from Cloudflare R2 on startup (before db.js is required)
  await restoreDatabase();

  // 2. Now import SQLite db instance and schedulers
  const db = require('./db');
  const { initInboxPollerScheduler } = require('./poller');
  const { initWarmupScheduler } = require('./warmup');
  const { syncLeadsFromSheet } = require('./sheets');

  // Express App Setup
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  // Import Routers
  const leadsRouter = require('./routes/leads');
  const campaignsRouter = require('./routes/campaigns');
  const emailsRouter = require('./routes/emails');
  const settingsRouter = require('./routes/settings');
  const cronRouter = require('./routes/cron');

  // Mount Routers
  app.use('/api/leads', leadsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api', emailsRouter); // Mount directly for /api/sent and /api/replies
  app.use('/api/settings', settingsRouter);
  app.use('/api/cron', cronRouter);

  // 1. GET /api/stats - Dashboard analytics calculations
  app.get('/api/stats', (req, res) => {
    try {
      const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
      const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'").get().count;
      const emailsSent = db.prepare('SELECT COUNT(*) as count FROM sent_emails').get().count;
      
      // Count distinct replies to calculate response rate
      const uniqueReplies = db.prepare('SELECT COUNT(DISTINCT sent_email_id) as count FROM replies').get().count;
      const responseRate = emailsSent > 0 ? Math.round((uniqueReplies / emailsSent) * 100) : 0;

      // Fetch recent replies (last 5)
      const recentReplies = db.prepare(`
        SELECT r.*, c.name as campaign_name, s.to_email as lead_email
        FROM replies r
        LEFT JOIN sent_emails s ON r.sent_email_id = s.id
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        ORDER BY r.received_at DESC
        LIMIT 5
      `).all();

      // Check if warmup is active/enabled in settings
      const warmupRow = db.prepare("SELECT value FROM settings WHERE key = 'WARMUP_ENABLED'").get();
      const warmupActive = warmupRow ? warmupRow.value !== 'false' : (process.env.WARMUP_ENABLED !== 'false');

      // Chart data: sends per day (last 7 days)
      const dailySends = db.prepare(`
        SELECT DATE(sent_at) as date, COUNT(*) as count 
        FROM sent_emails 
        WHERE sent_at >= DATE('now', '-7 days') 
        GROUP BY DATE(sent_at)
        ORDER BY DATE(sent_at) ASC
      `).all();

      // Fill in last 7 days chart array to ensure frontend displays continuous time graph
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const match = dailySends.find(item => item.date === dateStr);
        chartData.push({
          date: dateStr,
          sends: match ? match.count : 0
        });
      }

      res.json({
        totalLeads,
        activeCampaigns,
        emailsSent,
        responseRate,
        warmupActive,
        recentReplies,
        chartData
      });
    } catch (error) {
      console.error('[API Stats Error] GET /failed:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize Background Schedulers
  initInboxPollerScheduler();
  initWarmupScheduler();

  // Start Sheets lead sync cron (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Sheets Sync Cron] Triggered scheduled public Google Sheet sync...');
    await syncLeadsFromSheet();
  });

  // Start Express Listener
  const server = app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Outreach platform backend server is running...`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Database connected`);
    console.log(`=================================================`);
  });

  // Start Cloudflare R2 backup scheduler
  startBackupScheduler();

  // Graceful shutdown handler
  process.on('SIGTERM', () => {
    console.log('[Server SIGTERM] Closing Express server...');
    server.close(async () => {
      // Force database backup on shutdown
      await backupDatabase(true);
      db.close();
      console.log('[Server SIGTERM] Database closed. Server shutdown completed.');
      process.exit(0);
    });
  });

  // Also support SIGINT (Ctrl+C local interrupt)
  process.on('SIGINT', () => {
    console.log('[Server SIGINT] Closing Express server...');
    server.close(async () => {
      await backupDatabase(true);
      db.close();
      console.log('[Server SIGINT] Database closed. Server shutdown completed.');
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start backend server:', err);
  process.exit(1);
});
