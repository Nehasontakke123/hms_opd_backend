# Fix Twilio Authentication Error (20003)

## Error Explanation
Error code **20003** means "Authenticate" - your Twilio Account SID or Auth Token is incorrect or invalid.

## Quick Fix Steps

### Step 1: Get Your Twilio Credentials
1. Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys
2. Find your **Account SID** (starts with `AC` and is 34 characters long)
3. Find or create your **Auth Token** (32 characters)

### Step 2: Update Your .env File
Open `backend/.env` and update these lines:

```env
TWILIO_WHATSAPP_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_AUTH_TOKEN=your_32_character_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**⚠️ IMPORTANT:**
- No spaces around the `=` sign
- No quotes around the values
- Account SID must start with `AC`
- Auth Token must be exactly 32 characters (no spaces)

### Step 3: Verify Auth Token
- Auth Token is only shown **once** when created
- If you lost it, you must create a new one
- Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys
- Click "Create API Key" to generate a new Auth Token

### Step 4: Restart Your Server
After updating `.env`, you **MUST** restart your server:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test Authentication
Run the diagnostic script:
```bash
node testTwilioAuth.js
```

This will verify your credentials are correct.

## Common Issues

### Issue 1: Wrong Account SID
- **Symptom**: Account SID doesn't start with `AC` or wrong length
- **Fix**: Copy the exact Account SID from Twilio Console

### Issue 2: Invalid Auth Token
- **Symptom**: Auth Token doesn't match Account SID
- **Fix**: Create a new Auth Token in Twilio Console

### Issue 3: Credentials Revoked
- **Symptom**: Worked before, stopped working
- **Fix**: Check if Auth Token was revoked, create a new one

### Issue 4: Extra Spaces/Quotes
- **Symptom**: Credentials look correct but still fail
- **Fix**: Remove all spaces and quotes from .env values
  - ❌ Wrong: `TWILIO_WHATSAPP_ACCOUNT_SID = "AC123..." `
  - ✅ Correct: `TWILIO_WHATSAPP_ACCOUNT_SID=AC123...`

## Still Not Working?

1. **Verify Account Status**: Make sure your Twilio account is active
2. **Check Billing**: Ensure your account has sufficient balance
3. **Try Creating New Auth Token**: Sometimes regenerating helps
4. **Check .env Location**: Make sure `.env` is in the `backend/` directory
5. **Check File Encoding**: Ensure `.env` is saved as UTF-8

## Need Help?

If you continue to get error 20003 after following these steps:
1. Run: `node testTwilioAuth.js` to get detailed diagnostics
2. Check Twilio Console: https://console.twilio.com/us1/monitor/logs/sms
3. Verify credentials match what's in Twilio Console




