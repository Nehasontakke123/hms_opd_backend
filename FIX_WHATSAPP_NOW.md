# 🚨 WhatsApp Messages Stopped Working - Quick Fix Guide

## Problem
WhatsApp messages were working **yesterday** but **stopped working today**.

## Most Likely Cause
**Twilio WhatsApp Sandbox session expired** - This is common with Twilio trial accounts. Sandbox sessions can expire after 24 hours.

---

## ⚡ Quick Fix (3 Steps - 3 Minutes)

### Step 1: Rejoin WhatsApp Sandbox

1. **Go to Twilio Console**:
   - URL: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - Or: Login to https://console.twilio.com/ → Messaging → Try it out → Send a WhatsApp message

2. **Find Your Sandbox Join Code**:
   - You'll see something like: "Send `join <your-code>` to +1 415 523 8886"

3. **From YOUR WhatsApp**:
   - Send: `join <your-code>` to **+1 415 523 8886**
   - Wait for confirmation: "You are all set!"

⏱️ **Time**: 1 minute

---

### Step 2: Add Test Recipient (Patient's Phone)

1. **From PATIENT'S WhatsApp**:
   - Send the **same join code** to **+1 415 523 8886**
   - Wait for confirmation: "You are all set!"

⏱️ **Time**: 1 minute

---

### Step 3: Test It!

1. **Run Diagnostic Script**:
   ```bash
   cd backend
   node checkWhatsApp.js +919876543210
   ```
   (Replace `+919876543210` with a test phone number)

2. **Or Register a Test Patient**:
   - Go to Receptionist Dashboard
   - Register a new patient
   - Use a phone number that joined the sandbox
   - Check if WhatsApp message is received

⏱️ **Time**: 1 minute

---

## ✅ Verification

After rejoining the sandbox, you should see in backend console:

```
[WhatsApp] ✅ Patient notification sent successfully
[WhatsApp] Message sent to: +919876543210
[WhatsApp] Message SID: SM1234567890abcdef
```

---

## 🔍 If Still Not Working

### Check Backend Console Logs

When you register a patient, look for these logs:

**If you see**:
```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: twilio-error
[WhatsApp] ERROR 21610: WhatsApp is not enabled
```
**Solution**: Rejoin sandbox (Step 1 above)

**If you see**:
```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: twilio-error
[WhatsApp] ERROR 21608: Recipient not in sandbox
```
**Solution**: Patient must join sandbox (Step 2 above)

**If you see**:
```
[WhatsApp] ❌ Patient notification FAILED
[WhatsApp] Reason: credentials-missing
```
**Solution**: Check `.env` file has all WhatsApp variables

---

## 📋 Diagnostic Checklist

Run this to check your setup:

```bash
cd backend
node checkWhatsApp.js
```

This will:
- ✅ Verify environment variables are set
- ✅ Test Twilio API connection
- ✅ Check account status
- ✅ Provide specific error solutions

---

## 🎯 Common Issues & Solutions

### Issue 1: Sandbox Session Expired
**Symptoms**: Messages worked yesterday, stopped today
**Solution**: Rejoin sandbox (see Step 1)

### Issue 2: Recipient Not in Sandbox
**Symptoms**: Error 21608
**Solution**: Patient must join sandbox (see Step 2)

### Issue 3: Invalid Credentials
**Symptoms**: Error 20003 or 20001
**Solution**: Check `.env` file has correct Account SID and Auth Token

### Issue 4: Invalid Phone Number Format
**Symptoms**: Error 21211
**Solution**: Ensure phone numbers are in E.164 format (+91XXXXXXXXXX)

---

## 🔧 Advanced Troubleshooting

### Check Twilio Console Logs

1. Go to: https://console.twilio.com/us1/monitor/logs/sms
2. Look for recent WhatsApp message attempts
3. Check error codes and messages

### Verify Environment Variables

Check your `backend/.env` file has:
```env
TWILIO_WHATSAPP_ACCOUNT_SID=AC28e78330aeb7c862934e7fe222e7f472
TWILIO_WHATSAPP_AUTH_TOKEN=2bf25ad48f5a7229e8ed2ff7a940a23a
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Restart Backend Server

After changing `.env` or rejoining sandbox:
```bash
# Stop server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

---

## 📞 Support

- **Twilio Console**: https://console.twilio.com/
- **WhatsApp Sandbox**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **Twilio Docs**: https://www.twilio.com/docs/whatsapp

---

## 🎉 Expected Result

After fixing, when you register a patient:
1. ✅ Patient receives WhatsApp message
2. ✅ Backend console shows success message
3. ✅ Message appears in Twilio Console logs

---

**Total Fix Time**: 3-5 minutes


