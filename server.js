require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const validator = require('validator');

const {
  PG_CONNECTION,
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM,
  OTP_TTL_MINUTES = '10', OTP_LENGTH = '6',
  JWT_SECRET, JWT_EXPIRES_IN = '7d',
  FRONTEND_ORIGIN, PORT = 3001
} = process.env;

if (!PG_CONNECTION || !SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM || !JWT_SECRET) {
  console.error('Missing required environment variables. Check .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: PG_CONNECTION,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const randomOTP = (len = 6) => {
  let s = '';
  for (let i = 0; i < len; i++) s += String(Math.floor(Math.random() * 10));
  return s;
};

const hashValue = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(value, salt);
};

const verifyHash = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

const createJwt = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 8,
  message: { error: 'Too many requests, please wait a minute' }
});

const sendOtpEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Inter, Roboto, Arial; color:#111;">
      <h3>One-Time Code</h3>
      <p>Your verification code is <strong style="font-size:20px">${otp}</strong>. It will expire in ${OTP_TTL_MINUTES} minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    </div>
  `;
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Your verification code',
    html
  });
};

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/auth/send-otp', authLimiter, async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email || !validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const otp = randomOTP(Number(OTP_LENGTH));
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + Number(OTP_TTL_MINUTES) * 60 * 1000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `update public.email_otps set used = true where email = $1 and purpose = $2 and used = false`,
        [email, purpose]
      );

      await client.query(
        `insert into public.email_otps (email, otp_hash, purpose, expires_at) values ($1, $2, $3, $4)`,
        [email, otpHash, purpose, expiresAt]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    sendOtpEmail(email, otp).catch(err => console.error('Email send error:', err));

    return res.json({ ok: true, message: 'OTP sent if the email exists (check inbox/spam).' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body;
    if (!email || !validator.isEmail(email) || !otp) return res.status(400).json({ error: 'Invalid payload' });

    const { rows } = await pool.query(
      `select id, otp_hash, expires_at, used from public.email_otps
       where email = $1 and purpose = $2 and used = false
       order by created_at desc limit 1`,
      [email, purpose]
    );
    const record = rows[0];
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired' });
    }

    const ok = await verifyHash(otp, record.otp_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid code' });

    await pool.query(`update public.email_otps set used = true where id = $1`, [record.id]);

    const upsertRes = await pool.query(
      `insert into public.customers (email, is_verified, created_at)
       values ($1, true, now())
       on conflict (email) do update set is_verified = true
       returning id, email, is_verified`,
      [email]
    );

    const user = upsertRes.rows[0];

    const regToken = jwt.sign({ email, uid: user.id }, JWT_SECRET, { expiresIn: '15m' });

    return res.json({ ok: true, message: 'Verified', registration_token: regToken, customer_id: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { registration_token, password, full_name } = req.body;
    if (!registration_token || !password) return res.status(400).json({ error: 'Missing fields' });

    let payload;
    try {
      payload = jwt.verify(registration_token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired registration token' });
    }

    const email = payload.email;

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `insert into public.customers (email, password_hash, full_name, is_verified, created_at)
       values ($1, $2, $3, true, now())
       on conflict (email) do update set password_hash = $2, full_name = $3, is_verified = true
       returning id, email`,
      [email, passwordHash, full_name || null]
    );
    const user = rows[0];

    const token = createJwt({ uid: user.id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.json({ ok: true, message: 'Registered', token, customer_id: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const { rows } = await pool.query(`select id, email, password_hash from public.customers where email = $1 limit 1`, [email]);
    const user = rows[0];
    if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = createJwt({ uid: user.id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.json({ ok: true, token, customer_id: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ ok: true });
});

app.get('/auth/me', async (req, res) => {
  try {
    const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }

    const { rows } = await pool.query('select id, email, full_name, is_verified, created_at from public.customers where id = $1', [payload.uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Auth server listening on ${PORT}`));