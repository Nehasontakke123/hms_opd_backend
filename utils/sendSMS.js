import axios from 'axios';

/**
 * Send SMS to patient with appointment details
 * Supports multiple SMS providers
 */
export const sendSMS = async (mobileNumber, message) => {
  try {
    // Remove any non-digit characters from mobile number
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    
    // Use environment variable to determine SMS provider
    // Defaults to 'mock' if no provider is configured
    const smsProvider = process.env.SMS_PROVIDER || 'mock';
    
    switch (smsProvider.toLowerCase()) {
      case 'twilio':
        return await sendViaTwilio(cleanNumber, message);
      
      case 'msg91':
        return await sendViaMsg91(cleanNumber, message);
      
      case 'textlocal':
        return await sendViaTextLocal(cleanNumber, message);
      
      case 'mock':
      default:
        // For development/testing, just log the message
        console.log('📱 SMS (Mock Mode - No provider configured):', { 
          to: mobileNumber, 
          message 
        });
        console.log('⚠️  To enable real SMS, configure one of:');
        console.log('   - Twilio: Set SMS_PROVIDER=twilio and TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
        console.log('   - MSG91: Set SMS_PROVIDER=msg91 and MSG91_API_KEY');
        console.log('   - TextLocal: Set SMS_PROVIDER=textlocal and TEXTLOCAL_API_KEY');
        return { success: true, provider: 'mock', actuallySent: false };
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

/**
 * Send SMS via Twilio
 */
const sendViaTwilio = async (mobileNumber, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('🔍 Twilio Configuration Check:');
  console.log('  Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'NOT SET');
  console.log('  Auth Token:', authToken ? 'SET (hidden)' : 'NOT SET');
  console.log('  From Number:', fromNumber || 'NOT SET');

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('❌ Twilio credentials not configured. Using mock SMS.');
    console.log('📱 SMS (Mock):', { to: mobileNumber, message });
    return { success: true, provider: 'twilio-mock', actuallySent: false };
  }

  // Format number with country code (default to +91 for India)
  // Remove any existing country code and leading zeros
  let cleanedNumber = mobileNumber.replace(/\D/g, ''); // Remove non-digits
  
  // If number doesn't start with country code, add default
  let formattedNumber;
  try {
    if (cleanedNumber.startsWith('91') && cleanedNumber.length === 12) {
      formattedNumber = `+${cleanedNumber}`;
    } else if (cleanedNumber.length === 10) {
      formattedNumber = `+91${cleanedNumber}`; // Default to India (+91)
    } else if (mobileNumber.startsWith('+')) {
      formattedNumber = mobileNumber;
    } else {
      formattedNumber = `+91${cleanedNumber}`;
    }

    console.log('📤 Sending SMS via Twilio:');
    console.log('  To:', formattedNumber);
    console.log('  From:', fromNumber);
    console.log('  Message Length:', message.length, 'characters');

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: formattedNumber,
        From: fromNumber,
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

    console.log('✅ Twilio SMS sent successfully!');
    console.log('  Message SID:', response.data.sid);
    console.log('  Status:', response.data.status);

    return { 
      success: true, 
      provider: 'twilio', 
      sid: response.data.sid,
      status: response.data.status,
      actuallySent: true
    };
  } catch (error) {
    const finalNumber = formattedNumber || mobileNumber;
    
    console.error('❌ Twilio SMS Error Details:');
    console.error('  Error Message:', error.message);
    console.error('  Phone Number Used:', finalNumber);
    
    if (error.response) {
      console.error('  Status Code:', error.response.status);
      console.error('  Error Data:', JSON.stringify(error.response.data, null, 2));
      
      // Common Twilio errors
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid request';
        if (errorMsg.toLowerCase().includes('unverified') || errorMsg.toLowerCase().includes('not a valid')) {
          throw new Error(`Twilio Trial Account: Can only send SMS to verified phone numbers. Number used: ${finalNumber}. Please verify the number in Twilio Console or upgrade your account.`);
        } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('not a valid')) {
          throw new Error(`Invalid phone number format: ${finalNumber}. Please check the number format. Expected format: +[country code][number]`);
        }
      } else if (error.response.status === 401) {
        throw new Error('Twilio authentication failed. Please check your Account SID and Auth Token in environment variables.');
      } else if (error.response.status === 403) {
        throw new Error('Twilio account restriction. Check your Twilio account status, balance, and permissions in Twilio Console.');
      } else if (error.response.status === 404) {
        throw new Error('Twilio API endpoint not found. Check your Account SID.');
      }
    }
    
    // If it's a network error or other issue
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Network error connecting to Twilio: ${error.message}`);
    }
    
    throw error;
  }
};

/**
 * Send SMS via MSG91 (Popular in India)
 */
const sendViaMsg91 = async (mobileNumber, message) => {
  const apiKey = process.env.MSG91_API_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'TEKISK';

  if (!apiKey) {
    console.warn('MSG91 API key not configured. Using mock SMS.');
    console.log('📱 SMS (Mock):', { to: mobileNumber, message });
    return { success: true, provider: 'msg91-mock', actuallySent: false };
  }

  try {
    // Format number (remove leading + if present)
    const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber.slice(1) : mobileNumber;

    const response = await axios.post(
      'https://control.msg91.com/api/v5/flow/',
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: '1',
        recipients: [
          {
            mobiles: formattedNumber,
            var: message // Adjust based on MSG91 template variables
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'authkey': apiKey
        }
      }
    );

    return { success: true, provider: 'msg91', actuallySent: true };
  } catch (error) {
    console.error('MSG91 SMS error:', error.response?.data || error.message);
    // Fallback to simple API
    try {
      const response = await axios.get('https://control.msg91.com/api/sendhttp.php', {
        params: {
          authkey: apiKey,
          mobiles: mobileNumber,
          message: message,
          sender: senderId,
          route: 4
        }
      });
      return { success: true, provider: 'msg91', actuallySent: true };
    } catch (fallbackError) {
      console.error('MSG91 fallback error:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Send SMS via TextLocal (Works in India, UK, etc.)
 */
const sendViaTextLocal = async (mobileNumber, message) => {
  const apiKey = process.env.TEXTLOCAL_API_KEY;
  const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL';

  if (!apiKey) {
    console.warn('TextLocal API key not configured. Using mock SMS.');
    console.log('📱 SMS (Mock):', { to: mobileNumber, message });
    return { success: true, provider: 'textlocal-mock', actuallySent: false };
  }

  try {
    const response = await axios.post(
      'https://api.textlocal.in/send/',
      {
        apikey: apiKey,
        numbers: mobileNumber,
        message: message,
        sender: sender
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, provider: 'textlocal', actuallySent: true };
  } catch (error) {
    console.error('TextLocal SMS error:', error.response?.data || error.message);
    throw error;
  }
};

