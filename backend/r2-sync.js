const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const LOCAL_PATH = path.join(__dirname, 'outreach.db');
const FILE_KEY = 'outreach.db';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'outreach-db';

let r2Client = null;

// Initialize R2 client if environment variables are set
if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Downloads the database from R2 if available.
 * Must be called before db.js is required or initialized.
 */
async function restoreDatabase() {
  if (!r2Client) {
    console.log('⚠️ Cloudflare R2 not configured. SQLite will run entirely locally.');
    return;
  }

  try {
    console.log('🔄 Checking Cloudflare R2 for database backup...');
    const response = await r2Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: FILE_KEY,
    }));

    // Pipe response body to local database file
    const writeStream = fs.createWriteStream(LOCAL_PATH);
    
    await new Promise((resolve, reject) => {
      // In newer AWS SDK versions, Body is a readable stream or blob/web stream
      const stream = response.Body;
      if (typeof stream.pipe === 'function') {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      } else {
        // Fallback for environment/runtime differences
        stream.transformToByteArray()
          .then(bytes => {
            fs.writeFileSync(LOCAL_PATH, Buffer.from(bytes));
            resolve();
          })
          .catch(reject);
      }
    });

    console.log('✅ SQLite database successfully restored from Cloudflare R2.');
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      console.log('ℹ️ No existing database backup found in Cloudflare R2. A new database will be created.');
    } else {
      console.error('❌ Failed to restore database from Cloudflare R2:', error.message);
    }
  }
}

let isUploading = false;
let lastUploadedMtime = 0;

/**
 * Backs up the SQLite database file to R2 if modifications are detected.
 */
async function backupDatabase(force = false) {
  if (!r2Client) return;
  if (isUploading) return;

  try {
    if (!fs.existsSync(LOCAL_PATH)) return;

    const stats = fs.statSync(LOCAL_PATH);
    const currentMtime = stats.mtimeMs;

    // Only upload if file has been modified since last upload
    if (!force && currentMtime <= lastUploadedMtime) {
      return;
    }

    isUploading = true;
    
    // Copy the database file to a temp location to avoid locks
    const tempPath = LOCAL_PATH + '.tmp-backup';
    fs.copyFileSync(LOCAL_PATH, tempPath);

    const fileContent = fs.readFileSync(tempPath);

    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: FILE_KEY,
      Body: fileContent,
      ContentType: 'application/x-sqlite3',
    }));

    // Clean up temporary backup file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    lastUploadedMtime = currentMtime;
    console.log(`✅ SQLite database backup completed to Cloudflare R2 (${(fileContent.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    console.error('❌ Failed to backup database to Cloudflare R2:', error.message);
  } finally {
    isUploading = false;
  }
}

/**
 * Starts a periodic timer to check and backup the database.
 */
function startBackupScheduler() {
  if (!r2Client) return;
  
  console.log('🔄 Starting periodic Cloudflare R2 backup scheduler (every 10 seconds)...');
  
  // Set initial baseline
  if (fs.existsSync(LOCAL_PATH)) {
    const stats = fs.statSync(LOCAL_PATH);
    lastUploadedMtime = stats.mtimeMs;
  }

  setInterval(() => {
    backupDatabase().catch(err => console.error('[Backup Error]', err));
  }, 10000);
}

module.exports = {
  restoreDatabase,
  backupDatabase,
  startBackupScheduler,
};
