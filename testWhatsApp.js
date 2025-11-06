import dotenv from 'dotenv';
import { sendWhatsAppMessage } from './utils/sendWhatsApp.js';

// Load environment variables
dotenv.config();

const testWhatsApp = async () => {
  console.log('\n=== WhatsApp Configuration Test ===\n');
  
  // Check environment variables
  const accountSid = process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  
  console.log('1. Environment Variables Check:');
  console.log('   TWILIO_WHATSAPP_ACCOUNT_SID:', accountSid ? '✅ Set' : '❌ Missing');
  console.log('   TWILIO_WHATSAPP_AUTH_TOKEN:', authToken ? '✅ Set' : '❌ Missing');
  console.log('   TWILIO_WHATSAPP_FROM:', fromNumber || '❌ Missing');
  console.log('');
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ ERROR: Missing required environment variables!');
    console.error('   Please check your .env file in the backend directory.');
    process.exit(1);
  }
  
  // Get test phone number from command line or use default
  const testNumber = process.argv[2] || process.env.TEST_PHONE_NUMBER;
  
  if (!testNumber) {
    console.error('❌ ERROR: No test phone number provided!');
    console.error('   Usage: node testWhatsApp.js <phone_number>');
    console.error('   Example: node testWhatsApp.js +919876543210');
    console.error('   Or set TEST_PHONE_NUMBER in .env file');
    process.exit(1);
  }
  
  console.log('2. Test Configuration:');
  console.log('   From:', fromNumber);
  console.log('   To:', testNumber);
  console.log('');
  
  // Send test message
  const testMessage = `Hello! This is a test message from Tekisky Hospital OPD system.\n\nIf you received this, your WhatsApp integration is working correctly! ✅\n\nSent at: ${new Date().toLocaleString('en-IN')}`;
  
  console.log('3. Sending Test Message...');
  console.log('   Message:', testMessage.substring(0, 50) + '...');
  console.log('');
  
  try {
    const result = await sendWhatsAppMessage(testNumber, testMessage);
    
    console.log('4. Result:');
    if (result.success) {
      console.log('   ✅ SUCCESS! Message sent successfully!');
      console.log('   Message SID:', result.sid);
      console.log('   Status:', result.status);
      console.log('');
      console.log('   📱 Check your WhatsApp for the test message.');
    } else {
      console.log('   ❌ FAILED! Message could not be sent.');
      console.log('   Reason:', result.reason);
      console.log('   Error:', result.error);
      console.log('');
      
      if (result.reason === 'credentials-missing') {
        console.log('   💡 SOLUTION: Check your .env file has all required Twilio credentials.');
      } else if (result.reason === 'invalid-number') {
        console.log('   💡 SOLUTION: Ensure the phone number is in E.164 format (e.g., +919876543210)');
      } else if (result.reason === 'twilio-error') {
        console.log('   💡 POSSIBLE SOLUTIONS:');
        console.log('      1. Join Twilio WhatsApp Sandbox:');
        console.log('         - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
        console.log('         - Send "join <code>" to +1 415 523 8886 from your WhatsApp');
        console.log('      2. Ensure recipient has joined sandbox:');
        console.log('         - From recipient\'s WhatsApp, send "join <code>" to +1 415 523 8886');
        console.log('      3. Check Twilio account balance/credits');
        console.log('      4. Verify credentials are correct in .env file');
      }
    }
  } catch (error) {
    console.error('   ❌ ERROR:', error.message);
  }
  
  console.log('\n=== Test Complete ===\n');
};

testWhatsApp();







