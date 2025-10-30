# 🚀 QUICK FIX: Get SMS Working in 5 Minutes

## Problem
Twilio number `+16024836006` doesn't exist in your account, so SMS isn't working.

## Solution: Switch to TextLocal (FREE & Works Great for Indian Numbers)

### Step 1: Sign Up (2 minutes)
1. Go to: **https://www.textlocal.in/signup/**
2. Fill the form:
   - Email: Your email
   - Mobile: Your mobile number
   - Password: Create password
3. **Verify your email** (click link they send)
4. **Verify your mobile** (enter OTP they send)

### Step 2: Get API Key (1 minute)
1. Login to TextLocal: **https://www.textlocal.in/login/**
2. Go to **API** section in dashboard
3. Copy your **API Key**

### Step 3: Update Your .env File (I'll do this for you)
Just send me your API key and I'll update everything!

Or manually update `backend/.env`:
```env
SMS_PROVIDER=textlocal
TEXTLOCAL_API_KEY=your_api_key_here
TEXTLOCAL_SENDER=TXTLCL
```

### Step 4: Restart Backend
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 5: Test!
Create an appointment with number `9359481880` - SMS will work! ✅

---

## Why TextLocal?
- ✅ **FREE**: 100 SMS credits on signup
- ✅ **Works for India**: Perfect for Indian numbers
- ✅ **Simple**: Just API key, no phone number setup needed
- ✅ **Fast**: Set up in 5 minutes
- ✅ **Reliable**: Great delivery rates in India

---

## Alternative: Keep Using Twilio
If you want to fix Twilio instead:
1. Login: https://console.twilio.com/
2. Go to Phone Numbers → Buy a number
3. Purchase a number (often free with credits)
4. Update `TWILIO_PHONE_NUMBER` in .env
5. Verify recipient: +919359481880

But TextLocal is faster and easier! 🎯



