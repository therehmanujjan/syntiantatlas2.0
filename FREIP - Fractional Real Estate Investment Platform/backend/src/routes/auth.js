import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken, rateLimiter } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user (investor/seller only)
 * @access Public
 */
router.post('/register', rateLimiter(5, 60000), authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', rateLimiter(10, 60000), authController.login);

/**
 * @route POST /api/auth/google
 * @desc Authenticate with Google OAuth
 * @access Public
 */
router.post('/google', rateLimiter(10, 60000), authController.googleAuth);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', rateLimiter(20, 60000), authController.refreshToken);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticateToken, authController.me);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticateToken, authController.changePassword);

export default router;
