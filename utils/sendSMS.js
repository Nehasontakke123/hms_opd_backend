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
    const smsProvider = process.env.SMS_PROVIDER || 'twilio';
    
    switch (smsProvider.toLowerCase()) {
      case 'twilio':
        return await sendViaTwilio(cleanNumber, message);
      
      case 'msg91':
        return await sendViaMsg91(cleanNumber, message);
      
      case 'textlocal':
        return await sendViaTextLocal(cleanNumber, message);
      
      default:
        // For development/testing, just log the message
        console.log('📱 SMS (Mock):', { to: mobileNumber, message });
        return { success: true, provider: 'mock' };
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

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not configured. Using mock SMS.');
    console.log('📱 SMS (Mock):', { to: mobileNumber, message });
    return { success: true, provider: 'twilio-mock' };
  }

  try {
    // Format number with country code (default to +91 for India)
    const formattedNumber = mobileNumber.startsWith('+') 
      ? mobileNumber 
      : `+91${mobileNumber}`; // Adjust country code as needed

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

    return { success: true, provider: 'twilio', sid: response.data.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error.response?.data || error.message);
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
    return { success: true, provider: 'msg91-mock' };
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

    return { success: true, provider: 'msg91' };
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
      return { success: true, provider: 'msg91' };
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
    return { success: true, provider: 'textlocal-mock' };
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

    return { success: true, provider: 'textlocal' };
  } catch (error) {
    console.error('TextLocal SMS error:', error.response?.data || error.message);
    throw error;
  }
};

