# 🔧 WhatsApp Message Not Received - Troubleshooting Guide

## Quick Diagnosis

If WhatsApp messages are **not being received** when registering a new patient, follow these steps:

---

## Step 1: Check Backend Console Logs

When you register a patient, check your backend server console for WhatsApp-related logs:

### ✅ Success Logs (What you should see):
```
[WhatsApp] Preparing to send patient notification...
[WhatsApp] Patient mobile number from form: +919876543210
[WhatsApp] Sending confirmation message to patient mobile number: +919876543210
[WhatsApp] Sending message via Twilio
  From: whatsapp:+14155238886
  To: whatsapp:+919876543210
[WhatsApp] Message SID: SM1234567890abcdef
[WhatsApp] ✅ Patient notification sent successfully
```

### ❌ Error Logs (What you might see):
```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: credentials-missing
```
**Solution**: Check your `.env` file has all required credentials.

```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: twilio-error
[WhatsApp] ERROR: WhatsApp is not enabled for your account
```
**Solution**: Join Twilio WhatsApp Sandbox (see Step 2).

```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: invalid-number
```
**Solution**: Ensure phone number is in E.164 format (e.g., +919876543210).

---

## Step 2: Verify Twilio WhatsApp Sandbox Setup

### Required Actions:

1. **Join WhatsApp Sandbox** (Your Phone):
   - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - Find your sandbox join code
   - From **YOUR WhatsApp**, send `join <code>` to **+1 415 523 8886**
   - Wait for confirmation: "You are all set!"

2. **Add Test Recipient** (Patient's Phone):
   - From **PATIENT'S WhatsApp** (the number receiving notifications)
   - Send the **same join code** to **+1 415 523 8886**
   - Wait for confirmation: "You are all set!"

**⏱️ Time**: 3 minutes total

---

## Step 3: Test WhatsApp Configuration

Use the test script to verify your setup:

```bash
cd backend
node testWhatsApp.js +919876543210
```

Replace `+919876543210` with the patient's phone number (include country code).

### Expected Output:
```
=== WhatsApp Configuration Test ===

1. Environment Variables Check:
   TWILIO_WHATSAPP_ACCOUNT_SID: ✅ Set
   TWILIO_WHATSAPP_AUTH_TOKEN: ✅ Set
   TWILIO_WHATSAPP_FROM: whatsapp:+14155238886

2. Test Configuration:
   From: whatsapp:+14155238886
   To: +919876543210

3. Sending Test Message...

4. Result:
   ✅ SUCCESS! Message sent successfully!
   Message SID: SM1234567890abcdef
   Status: queued
```

---

## Step 4: Verify Environment Variables

Check your `backend/.env` file has these variables:

```env
TWILIO_WHATSAPP_ACCOUNT_SID=AC28e78330aeb7c862934e7fe222e7f472
TWILIO_WHATSAPP_AUTH_TOKEN=2bf25ad48f5a7229e8ed2ff7a940a23a
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DEFAULT_COUNTRY_CODE=91
```

**Important Notes:**
- `TWILIO_WHATSAPP_FROM` must be exactly: `whatsapp:+14155238886` (for sandbox)
- Phone numbers must be in E.164 format: `+91` followed by 10 digits
- No spaces in phone numbers

---

## Step 5: Common Issues & Solutions

### Issue 1: "Credentials Missing"
**Error**: `[WhatsApp] Twilio credentials missing. Skipping WhatsApp notification.`

**Solution**:
1. Check `.env` file exists in `backend/` directory
2. Verify all three variables are set:
   - `TWILIO_WHATSAPP_ACCOUNT_SID`
   - `TWILIO_WHATSAPP_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
3. Restart backend server after changing `.env`

### Issue 2: "WhatsApp Not Enabled" (Error 21610)
**Error**: `ERROR: WhatsApp is not enabled for your account`

**Solution**:
1. Join Twilio WhatsApp Sandbox (see Step 2.1)
2. Verify in Twilio Console: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

### Issue 3: "Recipient Not in Sandbox" (Error 21608)
**Error**: `ERROR: Invalid recipient number or recipient not in WhatsApp sandbox`

**Solution**:
1. Patient must join sandbox (see Step 2.2)
2. Both sender and recipient must be in sandbox

### Issue 4: "Invalid Phone Number"
**Error**: `[WhatsApp] Invalid recipient number`

**Solution**:
1. Ensure phone number includes country code (e.g., `+919876543210`)
2. No spaces or special characters
3. Format: `+` followed by country code + number

### Issue 5: "No Error, But No Message"
**Symptoms**: No error logs, but patient doesn't receive message

**Solution**:
1. Check Twilio Console logs: https://console.twilio.com/us1/monitor/logs/sms
2. Verify both parties joined sandbox
3. Check phone number format is correct
4. Verify Twilio account has credits/balance

---

## Step 6: Verify Code is Running

Check that WhatsApp code is being executed:

1. **Register a patient** from Receptionist Dashboard
2. **Check backend console** for these logs:
   ```
   [WhatsApp] Preparing to send patient notification...
   [WhatsApp] Patient mobile number from form: +91...
   ```

If you **don't see these logs**, the WhatsApp code might not be executing. Check:
- Patient registration succeeded
- WhatsApp credentials are configured
- Backend server is running

---

## Step 7: Check Twilio Console

1. **Login**: https://console.twilio.com/
2. **Go to**: Monitor → Logs → SMS
3. **Check**: Recent WhatsApp message attempts
4. **Look for**: Error codes or status messages

---

## Quick Checklist

- [ ] Backend `.env` file has all 3 WhatsApp variables
- [ ] You joined WhatsApp sandbox (your phone)
- [ ] Patient joined WhatsApp sandbox (their phone)
- [ ] Phone numbers are in E.164 format (+91XXXXXXXXXX)
- [ ] Backend server restarted after `.env` changes
- [ ] Test script runs successfully
- [ ] Twilio account has credits/balance

---

## Still Not Working?

1. **Run test script**: `node testWhatsApp.js +91XXXXXXXXXX`
2. **Check error message** from test script
3. **Follow specific solution** for that error
4. **Check Twilio Console** for detailed error logs

---

## Support Resources

- **Twilio Console**: https://console.twilio.com/
- **WhatsApp Sandbox**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **Twilio Docs**: https://www.twilio.com/docs/whatsapp
- **Quick Start Guide**: `QUICK_START_WHATSAPP.md`

---

**Last Updated**: Based on current codebase analysis




