import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const testTwilioAuth = async () => {
  console.log('🔍 Testing Twilio Authentication...\n');

  const accountSid = process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  // Check if credentials are present
  console.log('📋 Credential Check:');
  console.log('   Account SID:', accountSid ? `✅ ${accountSid.substring(0, 10)}...` : '❌ MISSING');
  console.log('   Auth Token:', authToken ? `✅ ${authToken.substring(0, 10)}...` : '❌ MISSING');
  console.log('   From Number:', fromNumber || '❌ MISSING');
  console.log('');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ ERROR: Missing required credentials in .env file');
    console.error('');
    console.error('📝 Please add the following to your .env file:');
    console.error('   TWILIO_WHATSAPP_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.error('   TWILIO_WHATSAPP_AUTH_TOKEN=your_auth_token_here');
    console.error('   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
    console.error('');
    console.error('🔗 Get your credentials from: https://console.twilio.com/us1/account/keys-credentials/api-keys');
    process.exit(1);
  }

  // Validate Account SID format
  if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
    console.error('❌ ERROR: Invalid Account SID format');
    console.error('   Account SID should start with "AC" and be 34 characters long');
    console.error('   Current:', accountSid);
    process.exit(1);
  }

  // Validate Auth Token format
  if (authToken.length !== 32) {
    console.error('❌ WARNING: Auth Token length seems incorrect');
    console.error('   Auth Token should be 32 characters long');
    console.error('   Current length:', authToken.length);
    console.error('   (This might still work, but please verify)');
  }

  // Test authentication by making a simple API call
  try {
    console.log('🔐 Testing authentication...');
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );

    console.log('✅ Authentication SUCCESS!');
    console.log('   Account Name:', response.data.friendly_name || 'N/A');
    console.log('   Account Status:', response.data.status || 'N/A');
    console.log('');
    console.log('✅ Your Twilio credentials are valid and working!');
    console.log('');
    console.log('💡 If you still get error 20003 when sending messages:');
    console.log('   1. Make sure you restarted the server after updating .env');
    console.log('   2. Check that the .env file is in the backend/ directory');
    console.log('   3. Verify no extra spaces or quotes in .env values');
    console.log('   4. Try regenerating the Auth Token in Twilio Console');
    
  } catch (error) {
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status;

    console.error('❌ Authentication FAILED!');
    console.error('   Status:', status || 'N/A');
    console.error('   Error Code:', errorCode || 'N/A');
    console.error('   Error Message:', errorMessage || 'N/A');
    console.error('');

    if (errorCode === 20003 || status === 401) {
      console.error('🔍 DIAGNOSIS: Invalid Account SID or Auth Token');
      console.error('');
      console.error('📝 STEPS TO FIX:');
      console.error('   1. Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys');
      console.error('   2. Find your Account SID (starts with "AC")');
      console.error('   3. Click "Create API Key" or use your existing Auth Token');
      console.error('   4. Copy the Account SID and Auth Token exactly (no spaces, no quotes)');
      console.error('   5. Update your .env file:');
      console.error('      TWILIO_WHATSAPP_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      console.error('      TWILIO_WHATSAPP_AUTH_TOKEN=your_auth_token_here');
      console.error('   6. Restart your server: npm run dev');
      console.error('');
      console.error('⚠️  IMPORTANT:');
      console.error('   - Auth Token is only shown once when created');
      console.error('   - If you lost it, create a new one');
      console.error('   - Make sure there are no spaces or quotes around values in .env');
      console.error('   - Account SID should start with "AC" (34 characters total)');
      console.error('   - Auth Token should be 32 characters');
    } else {
      console.error('❌ Unexpected error occurred');
      console.error('   Check Twilio Console for more details');
    }

    process.exit(1);
  }
};

testTwilioAuth();






