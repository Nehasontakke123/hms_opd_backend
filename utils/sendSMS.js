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
    const smsProvider = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();
    
    console.log('🔍 SMS Provider Configuration:');
    console.log('  SMS_PROVIDER env variable:', process.env.SMS_PROVIDER || 'NOT SET');
    console.log('  Using provider:', smsProvider);
    
    switch (smsProvider) {
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

  // Validate required credentials
  if (!accountSid || !authToken || !fromNumber) {
    console.warn('❌ Twilio credentials not configured. Using mock SMS.');
    console.log('📱 SMS (Mock):', { to: mobileNumber, message });
    return { success: true, provider: 'twilio-mock', actuallySent: false };
  }

  // Validate Account SID format (should start with AC)
  if (!accountSid.startsWith('AC')) {
    console.warn('⚠️  Twilio Account SID format may be incorrect (should start with AC).');
  }

  // Validate phone number format
  if (!fromNumber.startsWith('+')) {
    console.warn('⚠️  Twilio phone number should include country code with + prefix.');
  }

  // Format number with country code
  // Remove any existing country code and leading zeros
  let cleanedNumber = mobileNumber.replace(/\D/g, ''); // Remove non-digits
  
  // Get default country code from environment or detect from Twilio number
  const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || null;
  
  // If number doesn't start with country code, add default based on number pattern or configuration
  let formattedNumber;
  try {
    // If already has + prefix, use as is (assuming it has country code)
    if (mobileNumber.startsWith('+')) {
      formattedNumber = mobileNumber;
    } 
    // Detect Indian mobile numbers (10 digits starting with 6-9)
    else if (cleanedNumber.length === 10 && /^[6789]/.test(cleanedNumber)) {
      // This is an Indian mobile number - format as +91XXXXXXXXXX
      formattedNumber = `+91${cleanedNumber}`;
    }
    // If number already includes country code (like 91XXXXXXXXXX for India or 1XXXXXXXXXX for US)
    else if (cleanedNumber.startsWith('91') && cleanedNumber.length === 12) {
      formattedNumber = `+${cleanedNumber}`;
    }
    else if (cleanedNumber.startsWith('1') && cleanedNumber.length === 11) {
      formattedNumber = `+${cleanedNumber}`;
    }
    // Detect country code from Twilio number if available
    else if (fromNumber) {
      // Extract country code from Twilio number (e.g., +1 from +16024836006, +91 from +91XXXXXXXXXX)
      const twilioCountryCode = fromNumber.match(/^\+\d{1,3}/)?.[0] || '+1'; // Default to +1 (US)
      
      // Remove leading zeros
      if (cleanedNumber.startsWith('0')) {
        cleanedNumber = cleanedNumber.substring(1);
      }
      
      // Use configured default country code if available, otherwise use Twilio's country code
      const countryCodeToUse = defaultCountryCode ? `+${defaultCountryCode}` : twilioCountryCode;
      
      // If number is 10 digits, use the determined country code
      if (cleanedNumber.length === 10) {
        formattedNumber = `${countryCodeToUse}${cleanedNumber}`;
      }
      // If number is 11-15 digits, assume it has country code, just add +
      else if (cleanedNumber.length >= 11 && cleanedNumber.length <= 15) {
        formattedNumber = `+${cleanedNumber}`;
      }
      // Default: add country code
      else {
        formattedNumber = `${countryCodeToUse}${cleanedNumber}`;
      }
    }
    // Fallback: use configured default or assume +91 for India
    else {
      const fallbackCountryCode = defaultCountryCode ? `+${defaultCountryCode}` : '+91';
      if (cleanedNumber.startsWith('91') && cleanedNumber.length === 12) {
        formattedNumber = `+${cleanedNumber}`;
      } else if (cleanedNumber.length === 10) {
        formattedNumber = `${fallbackCountryCode}${cleanedNumber}`;
      } else {
        formattedNumber = `${fallbackCountryCode}${cleanedNumber}`;
      }
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
        const errorData = error.response.data || {};
        const errorMsg = errorData.message || 'Invalid request';
        const errorCode = errorData.code;
        
        // Error 21659: From number is not a Twilio phone number or country mismatch
        if (errorCode === 21659 || errorMsg.includes('not a Twilio phone number') || errorMsg.includes('country mismatch')) {
          throw new Error(`Twilio Phone Number Error: The phone number "${fromNumber}" is either not a valid Twilio number for your account, or there's a country mismatch. Please:\n1. Verify the number exists in your Twilio Console (https://console.twilio.com/)\n2. Ensure you own this number: ${fromNumber}\n3. If sending internationally, make sure international SMS is enabled on your account`);
        }
        // Error 21266: To and From numbers are the same
        else if (errorCode === 21266 || errorMsg.toLowerCase().includes('to\' and \'from\' number cannot be the same')) {
          throw new Error(`Configuration Error: The TWILIO_PHONE_NUMBER in your .env file (${fromNumber}) is set to the recipient's number. The "From" number must be a Twilio phone number from your account, not the recipient's number. Please:\n1. Get a Twilio phone number from https://console.twilio.com/us1/develop/phone-numbers/manage/incoming\n2. Update TWILIO_PHONE_NUMBER in backend/.env with your actual Twilio number\n3. The recipient number (${finalNumber}) will be automatically set as the "To" number`);
        }
        // Error 21211: Invalid 'To' phone number
        else if (errorCode === 21211 || errorMsg.toLowerCase().includes('invalid \'to\'')) {
          throw new Error(`Invalid recipient phone number: ${finalNumber}. Please check the number format. Expected format: +[country code][number]`);
        }
        // Error 21608: Cannot send SMS to unverified number (trial account)
        else if (errorCode === 21608 || errorMsg.toLowerCase().includes('unverified') || errorMsg.toLowerCase().includes('trial')) {
          throw new Error(`Twilio Trial Account: Can only send SMS to verified phone numbers. Recipient number: ${finalNumber}. Please verify the number in Twilio Console (https://console.twilio.com/us1/develop/phone-numbers/manage/verified) or upgrade your account.`);
        }
        // Generic invalid request
        else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('not a valid')) {
          throw new Error(`Invalid request: ${errorMsg}. Please check phone numbers and account configuration.`);
        }
        // Default 400 error
        else {
          throw new Error(`Twilio API Error (${errorCode || 400}): ${errorMsg}. Check your Twilio account configuration.`);
        }
      } else if (error.response.status === 401) {
        throw new Error('Twilio authentication failed. Please verify your Account SID and Auth Token in the .env file are correct.');
      } else if (error.response.status === 403) {
        throw new Error('Twilio account restriction. Check your account status, balance, and permissions in Twilio Console. International SMS may not be enabled.');
      } else if (error.response.status === 404) {
        throw new Error('Twilio API endpoint not found. Please verify your Account SID is correct in the .env file.');
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
    // Format number for TextLocal (Indian format: 10 digits or with country code)
    let formattedNumber = mobileNumber.replace(/\D/g, ''); // Remove non-digits
    
    // If number has country code (91), remove it for TextLocal
    if (formattedNumber.startsWith('91') && formattedNumber.length === 12) {
      formattedNumber = formattedNumber.substring(2); // Remove 91
    }
    // If number starts with +91, remove +91
    if (mobileNumber.startsWith('+91')) {
      formattedNumber = mobileNumber.replace('+91', '').replace(/\D/g, '');
    }

    console.log('📤 Sending SMS via TextLocal:');
    console.log('  To:', formattedNumber);
    console.log('  From:', sender);
    console.log('  Message Length:', message.length, 'characters');

    // TextLocal API v3 format
    const response = await axios.post(
      'https://api.textlocal.in/send/',
      new URLSearchParams({
        apikey: apiKey,
        numbers: formattedNumber,
        message: message,
        sender: sender
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ TextLocal SMS sent successfully!');
    console.log('  Response:', response.data);

    if (response.data.status === 'success') {
      return { 
        success: true, 
        provider: 'textlocal', 
        actuallySent: true,
        messageId: response.data.message_id || response.data.batch_id
      };
    } else {
      throw new Error(response.data.message || 'TextLocal SMS sending failed');
    }
  } catch (error) {
    console.error('❌ TextLocal SMS Error Details:');
    console.error('  Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      const errorMsg = error.response.data.message || 'Unknown error';
      if (errorMsg.includes('Invalid API key')) {
        throw new Error('TextLocal API key is invalid. Please check your TEXTLOCAL_API_KEY in .env file.');
      } else if (errorMsg.includes('insufficient balance') || errorMsg.includes('credits')) {
        throw new Error('TextLocal account has insufficient balance. Please recharge your account.');
      }
      throw new Error(`TextLocal Error: ${errorMsg}`);
    }
    throw error;
  }
};

