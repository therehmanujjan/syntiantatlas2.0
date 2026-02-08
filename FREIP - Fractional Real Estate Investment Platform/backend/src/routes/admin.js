import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard statistics
 * @access Admin only
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination and filtering
 * @access Admin only
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route GET /api/admin/users/:id
 * @desc Get single user by ID
 * @access Admin only
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @route POST /api/admin/users
 * @desc Create staff account with auto-generated credentials
 * @access Admin only
 */
router.post('/users', adminController.createStaffAccount);

/**
 * @route PUT /api/admin/users/:id
 * @desc Update user
 * @access Admin only
 */
router.put('/users/:id', adminController.updateUser);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Deactivate user (soft delete)
 * @access Admin only
 */
router.delete('/users/:id', adminController.deactivateUser);

/**
 * @route GET /api/admin/properties/pending
 * @desc Get pending property approvals
 * @access Admin only
 */
router.get('/properties/pending', adminController.getPendingProperties);

/**
 * @route PUT /api/admin/properties/:id/status
 * @desc Approve or reject property
 * @access Admin only
 */
router.put('/properties/:id/status', adminController.updatePropertyStatus);

/**
 * @route GET /api/admin/transactions
 * @desc Get all transactions with filtering
 * @access Admin only
 */
router.get('/transactions', adminController.getAllTransactions);

/**
 * @route GET /api/admin/audit-logs
 * @desc Get audit logs
 * @access Admin only
 */
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
