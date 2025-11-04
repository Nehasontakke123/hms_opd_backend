import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const checkMessageStatus = async (messageSid) => {
  if (!messageSid) {
    console.error('❌ ERROR: Please provide a Message SID');
    console.error('   Usage: node checkMessageStatus.js <message-sid>');
    console.error('   Example: node checkMessageStatus.js SM51057d653b3f2a3353f7d5015a8fcaa6');
    process.exit(1);
  }
  
  const accountSid = process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('❌ ERROR: Missing Twilio credentials in .env file');
    process.exit(1);
  }
  
  console.log('\n=== Checking WhatsApp Message Status ===\n');
  console.log('Message SID:', messageSid);
  console.log('');
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );
    
    const message = response.data;
    
    console.log('Message Details:');
    console.log('  Status:', message.status);
    console.log('  From:', message.from);
    console.log('  To:', message.to);
    console.log('  Body:', message.body.substring(0, 100) + '...');
    console.log('  Date Created:', message.dateCreated);
    console.log('  Date Sent:', message.dateSent || 'Not sent yet');
    console.log('  Date Updated:', message.dateUpdated);
    console.log('');
    
    if (message.status === 'queued') {
      console.log('⚠️  Status: QUEUED');
      console.log('   Message is queued for delivery.');
      console.log('   This usually means:');
      console.log('   - Recipient hasn\'t joined WhatsApp sandbox');
      console.log('   - Sandbox session expired (need to rejoin)');
      console.log('   - Message is waiting to be delivered');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   1. Check if recipient has joined WhatsApp sandbox');
      console.log('   2. If working yesterday, sandbox session likely expired');
      console.log('   3. Recipient needs to rejoin:');
      console.log('      - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
      console.log('      - Find sandbox join code');
      console.log('      - From recipient\'s WhatsApp, send "join <code>" to +1 415 523 8886');
      console.log('      - Wait for confirmation: "You are all set!"');
    } else if (message.status === 'sent') {
      console.log('✅ Status: SENT');
      console.log('   Message was sent to Twilio successfully.');
      console.log('   If recipient didn\'t receive it, check Twilio Console for delivery status.');
    } else if (message.status === 'delivered') {
      console.log('✅ Status: DELIVERED');
      console.log('   Message was successfully delivered to recipient!');
    } else if (message.status === 'failed') {
      console.log('❌ Status: FAILED');
      console.log('   Error Code:', message.errorCode);
      console.log('   Error Message:', message.errorMessage);
      console.log('');
      
      if (message.errorCode === 21610) {
        console.log('💡 SOLUTION: WhatsApp is not enabled. Join sandbox first.');
      } else if (message.errorCode === 21608) {
        console.log('💡 SOLUTION: Recipient not in WhatsApp sandbox.');
        console.log('   Recipient must join sandbox first.');
      }
    } else {
      console.log('ℹ️  Status:', message.status);
      console.log('   Check Twilio Console for more details:');
      console.log('   https://console.twilio.com/us1/monitor/logs/sms');
    }
    
    console.log('');
    console.log('📊 View in Twilio Console:');
    console.log(`   https://console.twilio.com/us1/monitor/logs/sms/${messageSid}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data?.message || error.message);
    if (error.response?.status === 404) {
      console.error('   Message SID not found. Check if the SID is correct.');
    } else if (error.response?.status === 401) {
      console.error('   Authentication failed. Check your Account SID and Auth Token.');
    }
  }
  
  console.log('=== Check Complete ===\n');
};

// Get Message SID from command line argument
const messageSid = process.argv[2];
checkMessageStatus(messageSid);


