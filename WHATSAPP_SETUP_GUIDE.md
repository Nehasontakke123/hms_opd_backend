# WhatsApp Integration Setup Guide for Tekisky Hospital

## Current Status
Your WhatsApp integration is **already implemented** in the code! The issue is likely with Twilio WhatsApp configuration.

## What's Already Done ✅

1. ✅ WhatsApp utility function created (`backend/utils/sendWhatsApp.js`)
2. ✅ Patient registration triggers WhatsApp notification
3. ✅ Environment variables configured in `.env`
4. ✅ Message formatting implemented

## What You Need to Check 🔍

### 1. Twilio WhatsApp Sandbox Activation

Twilio's WhatsApp API requires **sandbox activation** for testing:

1. **Login to Twilio Console**:
   - Go to: https://console.twilio.com/
   
2. **Navigate to WhatsApp**:
   - Go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Or: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   
3. **Follow Sandbox Instructions**:
   - You'll see a message like: "To use the Sandbox, send `join <code>` to +1 415 523 8886 from your WhatsApp"
   - Send the **join code** to the Twilio number from your WhatsApp
   - You'll receive a confirmation when connected

### 2. Verify WhatsApp Number in Twilio Console

1. **Check Messaging Settings**:
   - Go to: https://console.twilio.com/us1/develop/sms/settings/international-settings
   - Ensure **WhatsApp** is enabled for your account

2. **Verify Your From Number**:
   - The number `+14155238886` in your `.env` is correct for WhatsApp Sandbox
   - This is Twilio's official WhatsApp test number

### 3. Test Recipient Setup

**Important**: For WhatsApp Sandbox, you MUST:
- Send the join message from your **recipient's phone** (the phone that will receive notifications)
- The recipient must join the sandbox using their WhatsApp

**To add a recipient**:
1. From your recipient's WhatsApp, send: `join <sandbox-code>` to +1 415 523 8886
2. You'll get a confirmation when they're added

### 4. Check Twilio Account Type

- **Trial Account**: Free, limited to 24 hours after sandbox setup
- **Upgraded Account**: Full WhatsApp access, requires template approval for production

## Troubleshooting Common Issues

### Issue 1: "WhatsApp message not enabled"
**Solution**: You need to join the sandbox first (see step 1 above)

### Issue 2: "Message failed to send"
**Solution**: Check that:
- Recipient joined the sandbox
- Your `TWILIO_WHATSAPP_FROM` is exactly: `whatsapp:+14155238886`
- Account has credits/balance

### Issue 3: "No messages received"
**Solution**: 
- Verify recipient phone number is in E.164 format
- Check the sandbox is active
- Look at server logs for error details

## Testing Your Integration

### Step 1: Join Sandbox (One-Time Setup)
From your phone's WhatsApp, send the join code to +1 415 523 8886

### Step 2: Start Your Backend
```bash
cd backend
npm run dev
```

### Step 3: Register a Patient
1. Login to Receptionist Dashboard
2. Fill out patient registration form
3. Enter a **mobile number that has joined the sandbox**
4. Submit the form

### Step 4: Check Console Logs
You should see in your backend console:
```
[WhatsApp] Sending message via Twilio
  From: whatsapp:+14155238886
  To: whatsapp:+919359481880
[WhatsApp] Message SID: SM1234567890abcdef
```

If there's an error, check the error message in the logs.

## Production Setup (After Testing)

When you're ready for production:

1. **Apply for WhatsApp Business API**:
   - Go to: https://www.twilio.com/whatsapp
   - Apply for production access

2. **Create Message Templates**:
   - Templates are required for outbound messages
   - Go to: https://console.twilio.com/us1/develop/sms/tools/whatsapp-templates
   - Create templates for your messages

3. **Update Environment Variables**:
   - Replace sandbox number with your business number
   - All templates must be pre-approved by WhatsApp

## Current Configuration

Your `.env` file already has:
```env
<!-- TWILIO_WHATSAPP_ACCOUNT_SID=AC28e78330aeb7c862934e7fe222e7f472
TWILIO_WHATSAPP_AUTH_TOKEN=2bf25ad48f5a7229e8ed2ff7a940a23a
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DEFAULT_COUNTRY_CODE=91 -->

TWILIO_WHATSAPP_ACCOUNT_SID=YOUR_TWILIO_SID
TWILIO_WHATSAPP_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DEFAULT_COUNTRY_CODE=91

```

These are **correct**! The issue is likely that:
1. You haven't joined the sandbox yet, OR
2. The recipient hasn't joined the sandbox yet

## Quick Fix Steps

1. **Go to Twilio Console**: https://console.twilio.com/
2. **Find your WhatsApp Sandbox code**
3. **From your phone**, send `join <code>` to +1 415 523 8886
4. **Restart your backend server**
5. **Try registering a patient again**

## Support Resources

- Twilio WhatsApp Docs: https://www.twilio.com/docs/whatsapp
- Twilio Console: https://console.twilio.com/
- Twilio WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn







