# 📱 Complete TextLocal Setup Guide

## ❌ Current Problem
Your `.env` file is missing `TEXTLOCAL_API_KEY`, so SMS is in mock mode.

## ✅ Solution: Get TextLocal API Key (FREE - 5 minutes)

### Step 1: Sign Up for TextLocal (2 minutes)

1. **Open your browser** and go to:
   ```
   https://www.textlocal.in/signup/
   ```

2. **Fill the registration form**:
   - **Email**: Your email address
   - **Mobile Number**: Your mobile number (e.g., 9359481880)
   - **Password**: Create a strong password
   - **Confirm Password**: Re-enter password
   - Click **"Sign Up"** button

3. **Verify Email** (30 seconds):
   - Check your email inbox
   - Click the verification link from TextLocal
   - OR enter the verification code

4. **Verify Mobile** (30 seconds):
   - You'll receive an OTP on your mobile
   - Enter the OTP code
   - Click **"Verify"**

### Step 2: Login and Get API Key (1 minute)

1. **Login** to TextLocal: https://www.textlocal.in/login/
   - Use your email and password

2. **Go to API Section**:
   - After login, look for **"API"** in the top menu
   - OR go to: **Settings** → **API**
   - OR directly: https://www.textlocal.in/api/docs/

3. **Copy Your API Key**:
   - You'll see your **API Key** displayed
   - It looks like: `AbCdEf123456GhIjKlMnOpQrStUvWxYz` (long string)
   - **Click "Copy"** or select and copy it

### Step 3: Add API Key to Your Project (1 minute)

#### Option A: I'll Add It For You (FASTEST)
1. **Share your API key with me**
2. **I'll add it to your `.env` file immediately**
3. **You just restart the server**

#### Option B: Add It Yourself (Manual)
1. **Open this file**: `backend/.env`
2. **Add this line** at the end:
   ```
   TEXTLOCAL_API_KEY=your_api_key_here
   ```
3. **Replace `your_api_key_here`** with the actual key you copied
4. **Save the file**

**Example:**
```env
SMS_PROVIDER=textlocal
TEXTLOCAL_API_KEY=AbCdEf123456GhIjKlMnOpQrStUvWxYz
TEXTLOCAL_SENDER=TXTLCL
```

### Step 4: Restart Backend Server (30 seconds)

1. **Stop your current server**:
   - Press `Ctrl+C` in the terminal where backend is running

2. **Restart it**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Wait for**: `🚀 Server running on port 5000`

### Step 5: Test SMS (30 seconds)

1. **Go to**: http://localhost:3000
2. **Login** as receptionist
3. **Create a new appointment** with mobile: `9359481880`
4. **Check the backend console** - you should see:
   ```
   ✅ TextLocal SMS sent successfully!
   ```
5. **Check your phone** - SMS should arrive! 📱✅

---

## 📋 Quick Checklist

- [ ] Signed up at textlocal.in/signup/
- [ ] Verified email
- [ ] Verified mobile (OTP)
- [ ] Logged in to dashboard
- [ ] Copied API key from API section
- [ ] Added `TEXTLOCAL_API_KEY=...` to `backend/.env`
- [ ] Restarted backend server
- [ ] Tested by creating appointment
- [ ] SMS received on phone ✅

---

## 🆓 What You Get FREE

- ✅ **100 FREE SMS credits** on signup
- ✅ **Perfect for Indian numbers**
- ✅ **No phone number setup needed**
- ✅ **Works immediately after adding API key**

---

## 🆘 Need Help?

**If you can't find the API key:**
1. After login, go to: https://www.textlocal.in/api/docs/
2. Look for "API Key" section
3. Your API key will be displayed there

**Or contact TextLocal support:**
- Support: https://www.textlocal.in/help/
- Email: support@textlocal.in

---

## ✅ Once Done

After adding the API key and restarting, you'll see:
- ✅ `📤 Sending SMS via TextLocal:` in console
- ✅ `✅ TextLocal SMS sent successfully!` 
- ✅ SMS delivered to patient's phone!

**No more "TextLocal API key not configured" errors!** 🎉



