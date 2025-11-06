import axios from 'axios';

const formatMobileNumber = (mobileNumber) => {
  if (!mobileNumber) return null;

  const trimmed = mobileNumber.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const clean = trimmed.replace(/\D/g, '');

  if (!clean) return null;

  if (clean.startsWith('91') && clean.length === 12) {
    return `+${clean}`;
  }

  if (clean.length === 10 && /^[6-9]/.test(clean)) {
    return `+91${clean}`;
  }

  if (clean.length >= 11 && clean.length <= 15) {
    return `+${clean}`;
  }

  const fallback = process.env.DEFAULT_COUNTRY_CODE ? `+${process.env.DEFAULT_COUNTRY_CODE}${clean}` : `+91${clean}`;
  return fallback;
};

export const sendWhatsAppMessage = async (mobileNumber, message) => {
  const accountSid = process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[WhatsApp] Twilio credentials missing. Skipping WhatsApp notification.');
    return { success: false, reason: 'credentials-missing' };
  }

  const formatted = formatMobileNumber(mobileNumber);
  if (!formatted) {
    console.warn('[WhatsApp] Invalid recipient number:', mobileNumber);
    return { success: false, reason: 'invalid-number' };
  }

  const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`}`;
  const toWhatsApp = formatted.startsWith('whatsapp:') ? formatted : `whatsapp:${formatted}`;

  try {
    console.log('[WhatsApp] Sending message via Twilio');
    console.log('  From:', fromWhatsApp);
    console.log('  To:', toWhatsApp);

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: toWhatsApp,
        From: fromWhatsApp,
        Body: message
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

    console.log('[WhatsApp] Message SID:', response.data.sid);
    console.log('[WhatsApp] Message Status:', response.data.status);
    
    // Warn if message is queued - this might indicate delivery issues
    if (response.data.status === 'queued') {
      console.log('[WhatsApp] ⚠️  Message is queued. This means Twilio accepted it, but delivery is pending.');
      console.log('[WhatsApp] 💡 If message is not delivered, check:');
      console.log('[WhatsApp]    1. Recipient has joined WhatsApp sandbox');
      console.log('[WhatsApp]    2. Sandbox session hasn\'t expired (may need to rejoin)');
      console.log('[WhatsApp]    3. Check Twilio Console for delivery status: https://console.twilio.com/us1/monitor/logs/sms');
    } else if (response.data.status === 'failed') {
      console.error('[WhatsApp] ❌ Message failed to send!');
      console.error('[WhatsApp] Error Code:', response.data.errorCode);
      console.error('[WhatsApp] Error Message:', response.data.errorMessage);
    }
    
    return {
      success: true,
      actuallySent: true,
      sid: response.data.sid,
      status: response.data.status,
      errorCode: response.data.errorCode,
      errorMessage: response.data.errorMessage
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || error.message;
    
    console.error('[WhatsApp] Failed to send message:', errorDetails);
    
    // Provide specific guidance for common errors
    if (errorCode === 21610) {
      console.error('[WhatsApp] ❌ ERROR 21610: WhatsApp is not enabled for your account.');
      console.error('[WhatsApp] 💡 SOLUTION: Join the WhatsApp sandbox first.');
      console.error('[WhatsApp] 📱 Steps:');
      console.error('[WhatsApp]    1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
      console.error('[WhatsApp]    2. Find your sandbox join code');
      console.error('[WhatsApp]    3. From YOUR WhatsApp, send "join <code>" to +1 415 523 8886');
      console.error('[WhatsApp]    4. Wait for confirmation: "You are all set!"');
      console.error('[WhatsApp]    5. From PATIENT\'S WhatsApp, send the same "join <code>" to +1 415 523 8886');
      console.error('[WhatsApp]    6. Wait for confirmation');
      console.error('[WhatsApp]    7. Try registering a patient again');
    } else if (errorCode === 21608) {
      console.error('[WhatsApp] ❌ ERROR 21608: Invalid recipient number or recipient not in WhatsApp sandbox');
      console.error('[WhatsApp] 💡 SOLUTION: Ensure the recipient has joined the Twilio WhatsApp sandbox');
      console.error('[WhatsApp] 📱 Steps:');
      console.error('[WhatsApp]    1. From PATIENT\'S WhatsApp, send "join <sandbox-code>" to +1 415 523 8886');
      console.error('[WhatsApp]    2. Wait for confirmation: "You are all set!"');
      console.error('[WhatsApp]    3. Try registering the patient again');
    } else if (errorCode === 21211) {
      console.error('[WhatsApp] ❌ ERROR 21211: Invalid recipient number format');
      console.error('[WhatsApp] 💡 SOLUTION: Ensure phone number is in E.164 format (e.g., +919876543210)');
    } else if (errorCode === 20003 || errorCode === 20001) {
      console.error('[WhatsApp] ❌ ERROR: Authentication failed (Error Code: ' + errorCode + ')');
      console.error('[WhatsApp] 💡 SOLUTION: Check your Account SID and Auth Token in .env file');
      console.error('[WhatsApp] 📋 DIAGNOSIS:');
      console.error('[WhatsApp]    Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : '❌ MISSING');
      console.error('[WhatsApp]    Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : '❌ MISSING');
      console.error('[WhatsApp]    From Number:', fromNumber || '❌ MISSING');
      console.error('[WhatsApp] 📝 STEPS TO FIX:');
      console.error('[WhatsApp]    1. Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys');
      console.error('[WhatsApp]    2. Verify your Account SID (starts with "AC")');
      console.error('[WhatsApp]    3. Create or verify your Auth Token');
      console.error('[WhatsApp]    4. Update your .env file with correct credentials:');
      console.error('[WhatsApp]       TWILIO_WHATSAPP_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      console.error('[WhatsApp]       TWILIO_WHATSAPP_AUTH_TOKEN=your_auth_token_here');
      console.error('[WhatsApp]       TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
      console.error('[WhatsApp]    5. Restart your server after updating .env');
    } else if (errorMessage && errorMessage.includes('not a Twilio phone number')) {
      console.error('[WhatsApp] ❌ ERROR: Invalid "From" number');
      console.error('[WhatsApp] 💡 SOLUTION: Check TWILIO_WHATSAPP_FROM in .env file');
      console.error('[WhatsApp]    Should be: whatsapp:+14155238886 (for sandbox)');
    } else {
      console.error('[WhatsApp] ❌ ERROR: Unknown error occurred');
      console.error('[WhatsApp] 💡 Check Twilio Console for more details: https://console.twilio.com/us1/monitor/logs/sms');
    }
    
    return { success: false, reason: 'twilio-error', error: errorDetails, errorCode };
  }
};














