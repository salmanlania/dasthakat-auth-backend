# Dasthakat Auth Server (OTP + JWT + Supabase)

Minimal auth server implementing:
- Request OTP (email via Zoho SMTP)
- Verify OTP
- Register (after OTP) with password (hashed)
- Login (email + password)
- Refresh token via httpOnly cookie

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` (requires nodemon) or `npm start`

## Routes
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

