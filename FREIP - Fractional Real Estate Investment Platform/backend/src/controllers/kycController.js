import { query } from '../config/database.js';

/**
 * Get pending KYC verifications queue
 */
export const getKYCQueue = async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await query(`
      SELECT 
        kv.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.created_at as user_created_at,
        verifier.first_name as verifier_first_name,
        verifier.last_name as verifier_last_name
      FROM kyc_verifications kv
      JOIN users u ON kv.user_id = u.id
      LEFT JOIN users verifier ON kv.verified_by = verifier.id
      WHERE kv.status = $1
      ORDER BY kv.created_at ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

        const countResult = await query(`
      SELECT COUNT(*) FROM kyc_verifications WHERE status = $1
    `, [status]);

        res.json({
            verifications: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        });
    } catch (error) {
        console.error('Get KYC queue error:', error);
        res.status(500).json({ error: 'Failed to fetch KYC queue' });
    }
};

/**
 * Get KYC statistics
 */
export const getKYCStats = async (req, res) => {
    try {
        const stats = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM kyc_verifications
      GROUP BY status
    `);

        const todaySubmissions = await query(`
      SELECT COUNT(*) FROM kyc_verifications 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

        const todayVerified = await query(`
      SELECT COUNT(*) FROM kyc_verifications 
      WHERE DATE(verified_at) = CURRENT_DATE AND status = 'approved'
    `);

        const avgProcessingTime = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600) as avg_hours
      FROM kyc_verifications 
      WHERE verified_at IS NOT NULL
    `);

        const statusCounts = {};
        stats.rows.forEach(row => {
            statusCounts[row.status] = parseInt(row.count);
        });

        res.json({
            byStatus: statusCounts,
            todaySubmissions: parseInt(todaySubmissions.rows[0].count),
            todayVerified: parseInt(todayVerified.rows[0].count),
            avgProcessingTime: avgProcessingTime.rows[0].avg_hours
                ? parseFloat(avgProcessingTime.rows[0].avg_hours).toFixed(1)
                : 0
        });
    } catch (error) {
        console.error('Get KYC stats error:', error);
        res.status(500).json({ error: 'Failed to fetch KYC statistics' });
    }
};

/**
 * Get single KYC verification details
 */
export const getKYCDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        kv.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.kyc_status as current_kyc_status,
        u.kyc_level as current_kyc_level,
        u.created_at as user_created_at,
        verifier.first_name as verifier_first_name,
        verifier.last_name as verifier_last_name,
        verifier.email as verifier_email
      FROM kyc_verifications kv
      JOIN users u ON kv.user_id = u.id
      LEFT JOIN users verifier ON kv.verified_by = verifier.id
      WHERE kv.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'KYC verification not found' });
        }

        // Get user's past verifications
        const pastVerifications = await query(`
      SELECT id, kyc_level, verification_type, status, created_at, verified_at
      FROM kyc_verifications
      WHERE user_id = $1 AND id != $2
      ORDER BY created_at DESC
      LIMIT 5
    `, [result.rows[0].user_id, id]);

        res.json({
            verification: result.rows[0],
            pastVerifications: pastVerifications.rows
        });
    } catch (error) {
        console.error('Get KYC details error:', error);
        res.status(500).json({ error: 'Failed to fetch KYC details' });
    }
};

/**
 * Approve KYC verification
 */
export const approveKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { notes } = req.body;

        // Get verification details
        const verification = await query(`
      SELECT * FROM kyc_verifications WHERE id = $1
    `, [id]);

        if (verification.rows.length === 0) {
            return res.status(404).json({ error: 'KYC verification not found' });
        }

        if (verification.rows[0].status !== 'pending' && verification.rows[0].status !== 'under_review') {
            return res.status(400).json({ error: 'This verification has already been processed' });
        }

        const kycData = verification.rows[0];

        // Update verification status
        await query(`
      UPDATE kyc_verifications 
      SET status = 'approved',
          verified_by = $1,
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [adminId, id]);

        // Update user's KYC status
        await query(`
      UPDATE users 
      SET kyc_status = 'verified',
          kyc_level = GREATEST(kyc_level, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [kycData.kyc_level, kycData.user_id]);

        // Create audit log
        await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES ($1, 'kyc_approved', 'kyc_verification', $2, $3, $4)
    `, [adminId, id, JSON.stringify({ notes, kyc_level: kycData.kyc_level }), req.ip]);

        // Create notification for user
        await query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, 'kyc_approved', 'KYC Verification Approved', 
              'Your identity verification has been approved. You can now access all platform features.',
              $2)
    `, [kycData.user_id, JSON.stringify({ kyc_level: kycData.kyc_level })]);

        res.json({
            success: true,
            message: 'KYC verification approved successfully'
        });
    } catch (error) {
        console.error('Approve KYC error:', error);
        res.status(500).json({ error: 'Failed to approve KYC verification' });
    }
};

/**
 * Reject KYC verification
 */
export const rejectKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Get verification details
        const verification = await query(`
      SELECT * FROM kyc_verifications WHERE id = $1
    `, [id]);

        if (verification.rows.length === 0) {
            return res.status(404).json({ error: 'KYC verification not found' });
        }

        if (verification.rows[0].status !== 'pending' && verification.rows[0].status !== 'under_review') {
            return res.status(400).json({ error: 'This verification has already been processed' });
        }

        const kycData = verification.rows[0];

        // Update verification status
        await query(`
      UPDATE kyc_verifications 
      SET status = 'rejected',
          rejection_reason = $1,
          verified_by = $2,
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [rejection_reason, adminId, id]);

        // Update user's KYC status
        await query(`
      UPDATE users 
      SET kyc_status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [kycData.user_id]);

        // Create audit log
        await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES ($1, 'kyc_rejected', 'kyc_verification', $2, $3, $4)
    `, [adminId, id, JSON.stringify({ rejection_reason }), req.ip]);

        // Create notification for user
        await query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, 'kyc_rejected', 'KYC Verification Rejected', 
              $2,
              $3)
    `, [kycData.user_id, `Your identity verification was not approved. Reason: ${rejection_reason}`, JSON.stringify({ rejection_reason })]);

        res.json({
            success: true,
            message: 'KYC verification rejected'
        });
    } catch (error) {
        console.error('Reject KYC error:', error);
        res.status(500).json({ error: 'Failed to reject KYC verification' });
    }
};

/**
 * Request additional documents from user
 */
export const requestAdditionalDocs = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { message, required_documents } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const verification = await query(`
      SELECT * FROM kyc_verifications WHERE id = $1
    `, [id]);

        if (verification.rows.length === 0) {
            return res.status(404).json({ error: 'KYC verification not found' });
        }

        const kycData = verification.rows[0];

        // Update verification status
        await query(`
      UPDATE kyc_verifications 
      SET status = 'under_review',
          verification_data = COALESCE(verification_data, '{}') || $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify({ additional_docs_requested: message, required_documents }), id]);

        // Create notification for user
        await query(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, 'kyc_additional_docs', 'Additional Documents Required', 
              $2,
              $3)
    `, [kycData.user_id, message, JSON.stringify({ required_documents })]);

        // Audit log
        await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES ($1, 'kyc_additional_docs_requested', 'kyc_verification', $2, $3, $4)
    `, [adminId, id, JSON.stringify({ message, required_documents }), req.ip]);

        res.json({
            success: true,
            message: 'Additional document request sent to user'
        });
    } catch (error) {
        console.error('Request additional docs error:', error);
        res.status(500).json({ error: 'Failed to request additional documents' });
    }
};
