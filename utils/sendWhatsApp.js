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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
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
    return {
      success: true,
      actuallySent: true,
      sid: response.data.sid,
      status: response.data.status
    };
  } catch (error) {
    console.error('[WhatsApp] Failed to send message:', error.response?.data || error.message);
    return { success: false, reason: 'twilio-error', error };
  }
};




