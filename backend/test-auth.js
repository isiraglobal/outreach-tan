const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const user = process.env.GMAIL_USER;
const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');

console.log('Testing Gmail Authentication Settings...');
console.log('Gmail User:', user);
console.log('Gmail App Password Length:', pass.length);

async function testSMTP() {
  console.log('\n--- 1. Testing SMTP (Nodemailer) Connection ---');
  if (!user || !pass) {
    console.error('Credentials are not fully set in .env');
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection & Authentication Successful!');
    return true;
  } catch (error) {
    console.error('❌ SMTP Authentication Failed:', error.message);
    return false;
  }
}

async function testIMAP() {
  console.log('\n--- 2. Testing IMAP (ImapFlow) Connection ---');
  if (!user || !pass) {
    console.error('Credentials are not fully set in .env');
    return false;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    logger: false,
    auth: { user, pass }
  });

  client.on('error', err => {
    // Gracefully print async connection/timeout errors rather than crashing
    console.error('[IMAP Socket Error] Caught async socket error:', err.message);
  });

  try {
    await client.connect();
    console.log('✅ IMAP Connection & Authentication Successful!');
    
    // Check INBOX status
    let mailbox = await client.status('INBOX', { messages: true, unseen: true });
    console.log(`📬 Inbox Status: ${mailbox.messages} total messages, ${mailbox.unseen} unread.`);
    
    await client.logout();
    return true;
  } catch (error) {
    console.error('❌ IMAP Authentication Failed:', error.message);
    return false;
  }
}

async function runTests() {
  const smtpOk = await testSMTP();
  const imapOk = await testIMAP();
  
  console.log('\n--- Authentication Summary ---');
  if (smtpOk && imapOk) {
    console.log('🚀 All Gmail authentication tests PASSED! Your account is fully configured.');
  } else {
    console.log('⚠️ Some checks failed. Verify that "2-Step Verification" is enabled in your Google Account and that you have generated a dedicated "App Password".');
  }
}

runTests();
