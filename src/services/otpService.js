import { supabaseAdmin } from '../config/supabaseClient.js';
import { hashPassword, compareHash } from '../utils/hash.js';
import crypto from 'crypto';

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

export const generateNumericOTP = () => {
  let otp = '';
  while (otp.length < OTP_LENGTH) {
    const n = crypto.randomInt(0, 10);
    otp += String(n);
  }
  return otp;
};

export const createOtpRecord = async ({ email, purpose }) => {
  const otp = generateNumericOTP();
  const otpHash = await hashPassword(otp);
  const expires_at = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('otps').insert([{
    email,
    otp_hash: otpHash,
    purpose,
    expires_at,
  }]);

  if (error) throw error;
  return otp;
};

export const verifyOtp = async ({ email, otp, purpose }) => {
  const { data, error } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  const record = data && data[0];
  if (!record) return { ok: false, reason: 'no_otp' };

  if (new Date(record.expires_at) < new Date()) {
    return { ok: false, reason: 'expired' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  const match = await compareHash(otp, record.otp_hash);
  if (!match) {
    await supabaseAdmin.from('otps').update({ attempts: record.attempts + 1 }).eq('id', record.id);
    return { ok: false, reason: 'invalid' };
  }

  await supabaseAdmin.from('otps').delete().eq('id', record.id);
  return { ok: true };
};
