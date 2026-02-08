import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import crypto from 'crypto';

/**
 * Generate unique staff ID
 */
const generateStaffId = () => {
    const prefix = 'STF';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate secure temporary password
 */
const generateSecurePassword = () => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + symbols;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query("SELECT COUNT(*) as count FROM users WHERE role_id = 'investor'"),
            query("SELECT COUNT(*) as count FROM users WHERE role_id = 'seller'"),
            query("SELECT COUNT(*) as count FROM users WHERE role_id IN ('staff', 'operations_manager')"),
            query('SELECT COUNT(*) as count FROM properties'),
            query("SELECT COUNT(*) as count FROM properties WHERE status = 'active'"),
            query("SELECT COUNT(*) as count FROM properties WHERE status = 'pending'"),
            query('SELECT COALESCE(SUM(amount_invested), 0) as total FROM investments'),
            query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = $1', ['completed']),
            query("SELECT COUNT(*) as count FROM users WHERE kyc_status = 'pending'"),
            query(`SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
            query(`SELECT COUNT(*) as count FROM investments WHERE investment_date > NOW() - INTERVAL '7 days'`)
        ]);

        res.json({
            users: {
                total: parseInt(stats[0].rows[0].count),
                investors: parseInt(stats[1].rows[0].count),
                sellers: parseInt(stats[2].rows[0].count),
                staff: parseInt(stats[3].rows[0].count),
                newThisWeek: parseInt(stats[10].rows[0].count)
            },
            properties: {
                total: parseInt(stats[4].rows[0].count),
                active: parseInt(stats[5].rows[0].count),
                pending: parseInt(stats[6].rows[0].count)
            },
            investments: {
                totalValue: parseFloat(stats[7].rows[0].total),
                newThisWeek: parseInt(stats[11].rows[0].count)
            },
            transactions: {
                totalValue: parseFloat(stats[8].rows[0].total)
            },
            kyc: {
                pendingVerifications: parseInt(stats[9].rows[0].count)
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, status, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (role) {
            whereClause += ` AND role_id = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countResult = await query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const result = await query(
            `SELECT id, email, first_name, last_name, phone, role_id, kyc_status, kyc_level, 
              wallet_balance, status, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * Get single user by ID
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, email, first_name, last_name, phone, role_id, kyc_status, kyc_level, 
              wallet_balance, status, created_at, updated_at 
       FROM users WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

/**
 * Create staff account with auto-generated credentials
 */
export const createStaffAccount = async (req, res) => {
    try {
        const { email, first_name, last_name, phone, role_id } = req.body;

        // Validate role - only staff roles can be created by admin
        if (!['staff', 'operations_manager'].includes(role_id)) {
            return res.status(400).json({ error: 'Invalid role. Only staff or operations_manager can be created.' });
        }

        // Check if email exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate unique ID and password
        const staffId = generateStaffId();
        const temporaryPassword = generateSecurePassword();
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);

        // Create user
        const result = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, kyc_status, kyc_level, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'verified', 3, 'active') 
       RETURNING id, email, first_name, last_name, role_id, created_at`,
            [email, passwordHash, first_name, last_name, phone || null, role_id]
        );

        const user = result.rows[0];

        // Log the action
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address) 
       VALUES ($1, 'create_staff', 'user', $2, $3, $4)`,
            [req.user.id, user.id, JSON.stringify({ email, role_id, staffId }), req.ip]
        ).catch(console.error);

        res.status(201).json({
            message: 'Staff account created successfully',
            user: {
                id: user.id,
                staffId,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role_id
            },
            credentials: {
                email,
                temporaryPassword,
                note: 'Please share these credentials securely. User should change password on first login.'
            }
        });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: 'Failed to create staff account' });
    }
};

/**
 * Update user
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, role_id, status, kyc_status, kyc_level } = req.body;

        // Get current user data for audit log
        const currentUser = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Don't allow modifying the primary admin
        if (currentUser.rows[0].email === 'admin@freip.com' && req.user.email !== 'admin@freip.com') {
            return res.status(403).json({ error: 'Cannot modify primary admin account' });
        }

        const result = await query(
            `UPDATE users SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        role_id = COALESCE($4, role_id),
        status = COALESCE($5, status),
        kyc_status = COALESCE($6, kyc_status),
        kyc_level = COALESCE($7, kyc_level),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, email, first_name, last_name, phone, role_id, status, kyc_status, kyc_level`,
            [first_name, last_name, phone, role_id, status, kyc_status, kyc_level, id]
        );

        // Log the action
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) 
       VALUES ($1, 'update_user', 'user', $2, $3, $4, $5)`,
            [req.user.id, id, JSON.stringify(currentUser.rows[0]), JSON.stringify(result.rows[0]), req.ip]
        ).catch(console.error);

        res.json({
            message: 'User updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Get current user data
        const currentUser = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Don't allow deactivating the primary admin
        if (currentUser.rows[0].email === 'admin@freip.com') {
            return res.status(403).json({ error: 'Cannot deactivate primary admin account' });
        }

        await query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['suspended', id]);

        // Log the action
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address) 
       VALUES ($1, 'deactivate_user', 'user', $2, $3, $4)`,
            [req.user.id, id, JSON.stringify({ status: currentUser.rows[0].status }), req.ip]
        ).catch(console.error);

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
};

/**
 * Get pending property approvals
 */
export const getPendingProperties = async (req, res) => {
    try {
        const result = await query(
            `SELECT p.*, u.email as seller_email, u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM properties p
       JOIN users u ON p.seller_id = u.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC`
        );

        res.json({ properties: result.rows });
    } catch (error) {
        console.error('Get pending properties error:', error);
        res.status(500).json({ error: 'Failed to fetch pending properties' });
    }
};

/**
 * Approve or reject property
 */
export const updatePropertyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!['active', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be active or rejected.' });
        }

        const currentProperty = await query('SELECT * FROM properties WHERE id = $1', [id]);
        if (currentProperty.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        await query('UPDATE properties SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);

        // Log the action
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) 
       VALUES ($1, $2, 'property', $3, $4, $5, $6)`,
            [
                req.user.id,
                status === 'active' ? 'approve_property' : 'reject_property',
                id,
                JSON.stringify({ status: currentProperty.rows[0].status }),
                JSON.stringify({ status, reason }),
                req.ip
            ]
        ).catch(console.error);

        res.json({ message: `Property ${status === 'active' ? 'approved' : 'rejected'} successfully` });
    } catch (error) {
        console.error('Update property status error:', error);
        res.status(500).json({ error: 'Failed to update property status' });
    }
};

/**
 * Get all transactions with filtering
 */
export const getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (type) {
            whereClause += ` AND t.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const countResult = await query(`SELECT COUNT(*) as count FROM transactions t ${whereClause}`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const result = await query(
            `SELECT t.*, u.email as user_email, u.first_name, u.last_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            transactions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, action, entity_type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (action) {
            whereClause += ` AND a.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (entity_type) {
            whereClause += ` AND a.entity_type = $${paramIndex}`;
            params.push(entity_type);
            paramIndex++;
        }

        const countResult = await query(`SELECT COUNT(*) as count FROM audit_logs a ${whereClause}`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const result = await query(
            `SELECT a.*, u.email as user_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
