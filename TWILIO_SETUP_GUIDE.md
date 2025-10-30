# Twilio Free Account Setup Guide

## Step 1: Verify Your Current Twilio Account
1. Go to: https://console.twilio.com/
2. Login with your credentials
3. Navigate to: **Phone Numbers** → **Manage** → **Active numbers**
4. Check if you have any active phone numbers

## Step 2: If You Don't Have a Number
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/search
2. Click **Buy a number**
3. Select:
   - **Country**: United States (or India if available)
   - **Capabilities**: SMS
4. Search and purchase a number (often free with trial credits)
5. Copy the number (e.g., +1234567890)

## Step 3: Verify Recipient Number (For Trial Accounts)
If you're on a free trial account:
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click **Add a new number**
3. Enter recipient number: `+919359481880`
4. Click **Call Me** or **Text Me** for verification
5. Enter the verification code

## Step 4: Update Your .env File
Once you have a valid Twilio number:
```env
TWILIO_PHONE_NUMBER=+YourTwilioNumberHere
```

## Step 5: Enable International SMS (If Needed)
For sending to India from US number:
1. Go to: https://console.twilio.com/us1/settings/geo-permissions
2. Enable SMS to India
3. You may need to upgrade from trial (or use trial with verified numbers)



