import { supabaseAdmin } from '../config/supabaseClient.js';
import { createOtpRecord, verifyOtp } from '../services/otpService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { hashPassword, compareHash } from '../utils/hash.js';
import { createAccessToken, createRefreshToken } from '../services/tokenService.js';
import dotenv from 'dotenv';
dotenv.config();

export const requestOtp = async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const otp = await createOtpRecord({ email, purpose });
    await sendOtpEmail({ to: email, otp, purpose });
    return res.json({ ok: true, message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Missing fields' });
    const result = await verifyOtp({ email, otp, purpose });
    if (!result.ok) return res.status(400).json({ ok: false, reason: result.reason });
    return res.json({ ok: true, message: 'OTP verified' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed' });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    console.log('Register attempt', req.body);
    if (!email || !password) return (
      // console.log('Missing fields' , {
      //   email,
      //   password
      // }),
      res.status(400).json({ error: 'Missing fields' })
    );

    const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existing && existing.id) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await hashPassword(password);
    const insertObj = {
      email,
      customer_name: full_name || null,
      password_hash: passwordHash,
      is_email_verified: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from('users').insert([insertObj]).select('*').single();
    if (error) throw error;

    const payload = { id: data.id, email: data.email, role: 'customer' };
    const access = createAccessToken(payload);
    const refresh = createRefreshToken({ id: data.id });

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return res.json({ ok: true, token: access, customer_id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
    if (error || !data) return res.status(400).json({ error: 'Invalid credentials' });

    if (!data.password_hash) return res.status(400).json({ error: 'No password set; please use OTP flow' });

    const match = await compareHash(password, data.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { id: data.id, email: data.email, role: 'customer' };
    const access = createAccessToken(payload);
    const refresh = createRefreshToken({ id: data.id });

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return res.json({ ok: true, token: access, customer_id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin login attempt', req.body);
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabaseAdmin.from('admin').select('*').eq('email', email).single();
    console.log('Admin login data', {data, error});
    // if (error || !data) return res.status(400).json({ error: 'Invalid credentials' });
    if (error || !data) return res.status(400).json({ error: 'Invalid data' });

    if (!data.password_hash) return res.status(400).json({ error: 'No password set; please use OTP flow' });

    const match = await compareHash(password, data.password_hash);
    // if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    if (!match) return res.status(400).json({ error: 'Invalid pass' });

    const payload = { id: data.id, email: data.email, role: 'admin' };
    const access = createAccessToken(payload);
    const refresh = createRefreshToken({ id: data.id });

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return res.json({ ok: true, token: access, admin_id: data.id });
  } catch (err) {
    console.log('err', err);
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refresh = req.cookies['refresh_token'];
    if (!refresh) return res.status(401).json({ error: 'No refresh' });

    const { verifyRefreshToken } = await import('../services/tokenService.js');
    let payload;
    try {
      payload = verifyRefreshToken(refresh);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid refresh' });
    }

    const { data } = await supabaseAdmin.from('users').select('*').eq('id', payload.id).single();
    if (!data) return res.status(404).json({ error: 'User not found' });

    const access = createAccessToken({ id: data.id, email: data.email, role: 'customer' });
    const newRefresh = createRefreshToken({ id: data.id });

    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.json({ ok: true, token: access, customer_id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Refresh failed' });
  }
};
