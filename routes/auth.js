import express from 'express';
const router = express.Router();
import { Passport } from "passport";

import AuthController from '../controllers/authController.js';
const authController = new AuthController();

router.post('/login', authController.Login.bind(authController));
router.post('/forgot-password', authController.ForgotPassword.bind(authController));
router.post('/reset-password', authController.ResetPassword.bind(authController));
router.post('/verify-otp', authController.VerifyOtp.bind(authController));
// router.post('/logout', Passport.authenticate('jwt', { failureMessage: 'You are not logged in' }), authController.Logout.bind(authController));
export default router;