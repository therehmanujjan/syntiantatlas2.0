import express from 'express';
import * as kycController from '../controllers/kycController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All KYC routes require authentication
router.use(authenticateToken);

// Admin and Operations Manager can access KYC routes
router.use(requireRole(['admin', 'operations_manager']));

/**
 * @route GET /api/kyc/queue
 * @desc Get KYC verification queue
 * @access Admin, Operations Manager
 */
router.get('/queue', kycController.getKYCQueue);

/**
 * @route GET /api/kyc/stats
 * @desc Get KYC statistics
 * @access Admin, Operations Manager
 */
router.get('/stats', kycController.getKYCStats);

/**
 * @route GET /api/kyc/:id
 * @desc Get single KYC verification details
 * @access Admin, Operations Manager
 */
router.get('/:id', kycController.getKYCDetails);

/**
 * @route POST /api/kyc/:id/approve
 * @desc Approve KYC verification
 * @access Admin, Operations Manager
 */
router.post('/:id/approve', kycController.approveKYC);

/**
 * @route POST /api/kyc/:id/reject
 * @desc Reject KYC verification
 * @access Admin, Operations Manager
 */
router.post('/:id/reject', kycController.rejectKYC);

/**
 * @route POST /api/kyc/:id/request-docs
 * @desc Request additional documents from user
 * @access Admin, Operations Manager
 */
router.post('/:id/request-docs', kycController.requestAdditionalDocs);

export default router;
