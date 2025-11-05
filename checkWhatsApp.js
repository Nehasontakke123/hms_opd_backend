import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const checkWhatsApp = async () => {
  console.log('\n=== WhatsApp Connection Diagnostic ===\n');
  
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
  
  // Test Twilio API connection
  console.log('2. Testing Twilio API Connection...');
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );
    
    console.log('   ✅ Twilio API connection successful!');
    console.log('   Account Status:', response.data.status);
    console.log('   Account Type:', response.data.type);
    console.log('');
    
    // Check account balance (if available)
    if (response.data.type === 'Full' || response.data.type === 'Trial') {
      console.log('3. Account Information:');
      console.log('   Account Type:', response.data.type);
      
      if (response.data.type === 'Trial') {
        console.log('   ⚠️  Trial Account: Limited functionality');
        console.log('   💡 WhatsApp Sandbox sessions may expire after 24 hours');
      }
      console.log('');
    }
  } catch (error) {
    console.error('   ❌ Twilio API connection failed!');
    console.error('   Error:', error.response?.data?.message || error.message);
    console.error('');
    
    if (error.response?.status === 401) {
      console.error('   💡 SOLUTION: Invalid credentials. Check your Account SID and Auth Token in .env file.');
    }
    process.exit(1);
  }
  
  // Check WhatsApp sandbox status
  console.log('4. WhatsApp Sandbox Status:');
  console.log('   ⚠️  IMPORTANT: If messages stopped working after working yesterday:');
  console.log('   This is likely because the WhatsApp sandbox session expired.');
  console.log('');
  console.log('   📱 TO FIX: Rejoin WhatsApp Sandbox');
  console.log('   1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
  console.log('   2. Find your sandbox join code');
  console.log('   3. From YOUR WhatsApp, send "join <code>" to +1 415 523 8886');
  console.log('   4. Wait for confirmation: "You are all set!"');
  console.log('   5. From PATIENT\'S WhatsApp, send the same "join <code>" to +1 415 523 8886');
  console.log('   6. Wait for confirmation');
  console.log('   7. Try registering a patient again');
  console.log('');
  
  // Test message sending (if test number provided)
  const testNumber = process.argv[2];
  if (testNumber) {
    console.log('5. Testing Message Sending...');
    console.log('   To:', testNumber);
    
    const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`}`;
    const toWhatsApp = testNumber.startsWith('whatsapp:') ? testNumber : `whatsapp:${testNumber.startsWith('+') ? testNumber : `+${testNumber}`}`;
    
    const testMessage = `Test message from Tekisky Hospital OPD system.\n\nSent at: ${new Date().toLocaleString('en-IN')}\n\nIf you received this, your WhatsApp integration is working! ✅`;
    
    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: toWhatsApp,
          From: fromWhatsApp,
          Body: testMessage
        }),
        {
          auth: {
            username: accountSid,
            password: authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('   ✅ Test message sent successfully!');
      console.log('   Message SID:', response.data.sid);
      console.log('   Status:', response.data.status);
      console.log('');
      console.log('   📱 Check your WhatsApp for the test message.');
    } catch (error) {
      console.error('   ❌ Test message failed!');
      const errorCode = error.response?.data?.code;
      const errorMsg = error.response?.data?.message || error.message;
      
      console.error('   Error Code:', errorCode || 'N/A');
      console.error('   Error Message:', errorMsg);
      console.error('');
      
      if (errorCode === 21610) {
        console.error('   💡 SOLUTION: WhatsApp is not enabled for your account.');
        console.error('      You need to join the WhatsApp sandbox first.');
        console.error('      See step 4 above for instructions.');
      } else if (errorCode === 21608) {
        console.error('   💡 SOLUTION: Recipient not in WhatsApp sandbox.');
        console.error('      The recipient must join the sandbox first.');
        console.error('      See step 4 above for instructions.');
      } else if (errorCode === 21211) {
        console.error('   💡 SOLUTION: Invalid recipient number format.');
        console.error('      Ensure number is in E.164 format (e.g., +919876543210)');
      }
    }
  } else {
    console.log('5. To test message sending, run:');
    console.log('   node checkWhatsApp.js +919876543210');
    console.log('   (Replace with actual phone number)');
  }
  
  console.log('\n=== Diagnostic Complete ===\n');
};

checkWhatsApp();




