const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env variables
dotenv.config();

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

console.log('⚡ Cloudflare R2 Connection Test Utility');
console.log('--------------------------------------');
console.log('R2_BUCKET_NAME:', BUCKET_NAME || '(Not Configured)');
console.log('R2_ENDPOINT:', ENDPOINT || '(Not Configured)');
console.log('R2_ACCESS_KEY_ID:', ACCESS_KEY_ID ? '***' + ACCESS_KEY_ID.slice(-4) : '(Not Configured)');
console.log('R2_SECRET_ACCESS_KEY:', SECRET_ACCESS_KEY ? '******' : '(Not Configured)');
console.log('');

if (!BUCKET_NAME || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('❌ Error: Cloudflare R2 environment variables are incomplete.');
  console.error('Make sure you have set BUCKET_NAME, ENDPOINT, ACCESS_KEY_ID, and SECRET_ACCESS_KEY in your .env file.');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function runTest() {
  try {
    console.log('1. Attempting to list objects in bucket...');
    const listResponse = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 5,
    }));
    console.log(`   ✅ Success! Found ${listResponse.Contents?.length || 0} objects in the bucket.`);

    console.log('\n2. Attempting upload check...');
    const testKey = 'test-connection-file.txt';
    const testContent = `Cloudflare R2 connection test successful at: ${new Date().toISOString()}`;
    
    await client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }));
    console.log(`   ✅ Success! Test connection file uploaded.`);

    console.log('\n3. Attempting download check...');
    const getResponse = await client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    }));
    
    let content = '';
    const stream = getResponse.Body;
    if (typeof stream.pipe === 'function') {
      content = await new Promise((resolve, reject) => {
        let data = '';
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
      });
    } else {
      const bytes = await stream.transformToByteArray();
      content = Buffer.from(bytes).toString('utf-8');
    }

    console.log(`   ✅ Success! Test connection file downloaded.`);
    console.log(`   Content: "${content}"`);

    console.log('\n🌟 Cloudflare R2 Configuration is 100% Correct and Fully Operational!');
  } catch (error) {
    console.error('\n❌ Connection Test Failed:');
    console.error(error.message);
    console.error(error);
  }
}

runTest();
