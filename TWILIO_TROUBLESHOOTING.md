# Twilio SMS Troubleshooting Guide

## Current Error: Error Code 21659
**Error Message**: "'From' +16024836006 is not a Twilio phone number or Short Code country mismatch"

## What This Means
This error occurs when:
1. The phone number `+16024836006` doesn't exist in your Twilio account
2. The phone number belongs to a different Twilio account
3. There's a country mismatch (trying to send internationally without proper setup)

## Solutions

### Solution 1: Verify Your Twilio Phone Number
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Check if `+16024836006` is listed there
4. If not, you need to:
   - Purchase a new Twilio phone number, OR
   - Use an existing number from your account

### Solution 2: Update Your .env File
Once you have the correct phone number:
1. Open `backend/.env`
2. Update `TWILIO_PHONE_NUMBER` with your actual Twilio number
3. Format: `TWILIO_PHONE_NUMBER=+1234567890` (include the + and country code)
4. Restart your backend server

### Solution 3: For International SMS (US to India)
If you want to send SMS from US number to Indian numbers:
1. **Enable International SMS**:
   - Go to Twilio Console → Settings → Geo Permissions
   - Enable SMS to India
2. **Account Type**:
   - Trial accounts have restrictions
   - Upgrade to a paid account for full international SMS support
3. **Verify Destination Number** (for trial accounts):
   - Go to [Verified Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
   - Add `+919359481880` to verified numbers

### Solution 4: Use Indian SMS Provider (Recommended for India)
If you're primarily sending to Indian numbers, consider:
- **MSG91** (better for India): Set `SMS_PROVIDER=msg91` in .env
- **TextLocal**: Set `SMS_PROVIDER=textlocal` in .env

## Quick Fix Steps

1. **Check your Twilio Console**:
   ```
   https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   ```

2. **Get your correct phone number** and update `.env`:
   ```env
   TWILIO_PHONE_NUMBER=+YourActualTwilioNumber
   ```

3. **Restart backend server**

4. **Test again**

## Alternative: Purchase/Get a Twilio Number
1. Go to [Buy a Number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
2. Select country (US or India preferred)
3. Purchase the number
4. Update your `.env` file with the new number

## Need Help?
Check server logs for detailed error messages. The improved error handling will now show specific guidance for each error type.



