import express from 'express';
import {
  requestOtp,
  verifyOtpController,
  register,
  login,
  refreshToken
} from '../controllers/authController.js';

const router = express.Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtpController);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

export default router;
