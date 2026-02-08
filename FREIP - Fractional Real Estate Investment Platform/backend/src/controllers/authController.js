import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate JWT tokens
 */
const generateTokens = (userId, role) => {
    const accessToken = jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
};

/**
 * Register new user (investor/seller only)
 */
export const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone, role_id } = req.body;

        // Validate role - only investor and seller can self-register
        if (!['investor', 'seller'].includes(role_id)) {
            return res.status(400).json({ error: 'Invalid role. Only investor or seller accounts can be registered.' });
        }

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        const result = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, kyc_status, kyc_level) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 1) 
       RETURNING id, email, first_name, last_name, role_id, kyc_status, kyc_level, wallet_balance, created_at`,
            [email, passwordHash, first_name, last_name, phone || null, role_id]
        );

        const user = result.rows[0];
        const { accessToken, refreshToken } = generateTokens(user.id, user.role_id);

        // Log the registration
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address) 
       VALUES ($1, 'register', 'user', $1, $2, $3)`,
            [user.id, JSON.stringify({ email, role_id }), req.ip]
        ).catch(console.error); // Don't fail registration if audit log fails

        res.status(201).json({
            message: 'Registration successful',
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role_id,
                kyc_status: user.kyc_status,
                kyc_level: user.kyc_level,
                wallet_balance: user.wallet_balance
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

/**
 * Login with email and password
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const result = await query(
            'SELECT id, email, password_hash, first_name, last_name, role_id, kyc_status, kyc_level, wallet_balance, phone, status FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if account is active
        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Account is suspended. Please contact support.' });
        }
        if (user.status === 'banned') {
            return res.status(403).json({ error: 'Account is banned.' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id, user.role_id);

        // Update last login and log the action
        await query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) 
       VALUES ($1, 'login', 'user', $1, $2)`,
            [user.id, req.ip]
        ).catch(console.error);

        res.json({
            message: 'Login successful',
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                role: user.role_id,
                kyc_status: user.kyc_status,
                kyc_level: user.kyc_level,
                wallet_balance: user.wallet_balance
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'refresh') {
            return res.status(400).json({ error: 'Invalid refresh token' });
        }

        // Get current user data
        const result = await query(
            'SELECT id, role_id, status FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.status === 'suspended' || user.status === 'banned') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role_id);

        res.json({
            token: accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Refresh token expired. Please login again.' });
        }
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
};

/**
 * Get current user
 */
export const me = async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                phone: req.user.phone,
                role: req.user.role_id,
                kyc_status: req.user.kyc_status,
                kyc_level: req.user.kyc_level,
                wallet_balance: req.user.wallet_balance,
                created_at: req.user.created_at
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

/**
 * Logout (for token invalidation in future - currently just client-side)
 */
export const logout = async (req, res) => {
    try {
        // Log the logout
        if (req.user) {
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) 
         VALUES ($1, 'logout', 'user', $1, $2)`,
                [req.user.id, req.ip]
            ).catch(console.error);
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

/**
 * Google OAuth - Handle callback and create/link user
 */
export const googleAuth = async (req, res) => {
    try {
        const { googleToken, role_id } = req.body;

        // In production, verify the Google token with Google's API
        // For now, we'll decode it (this should use googleapis library in production)

        // This is a placeholder - in production, use:
        // const { OAuth2Client } = require('google-auth-library');
        // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        // const ticket = await client.verifyIdToken({ idToken: googleToken, audience: GOOGLE_CLIENT_ID });
        // const payload = ticket.getPayload();

        // For demo purposes, we'll accept the token data directly
        const { email, given_name, family_name, sub: googleId } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required from Google auth' });
        }

        // Validate role
        if (role_id && !['investor', 'seller'].includes(role_id)) {
            return res.status(400).json({ error: 'Invalid role for Google signup' });
        }

        // Check if user exists
        let result = await query('SELECT * FROM users WHERE email = $1', [email]);
        let user;
        let isNewUser = false;

        if (result.rows.length === 0) {
            // Create new user
            isNewUser = true;
            const insertResult = await query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role_id, kyc_status, kyc_level) 
         VALUES ($1, $2, $3, $4, $5, 'pending', 1) 
         RETURNING id, email, first_name, last_name, role_id, kyc_status, kyc_level, wallet_balance`,
                [email, 'GOOGLE_OAUTH', given_name || 'Google', family_name || 'User', role_id || 'investor']
            );
            user = insertResult.rows[0];

            // Log new user creation
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address) 
         VALUES ($1, 'google_register', 'user', $1, $2, $3)`,
                [user.id, JSON.stringify({ email, role_id: role_id || 'investor' }), req.ip]
            ).catch(console.error);
        } else {
            user = result.rows[0];

            // Log login
            await query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) 
         VALUES ($1, 'google_login', 'user', $1, $2)`,
                [user.id, req.ip]
            ).catch(console.error);
        }

        const { accessToken, refreshToken } = generateTokens(user.id, user.role_id);

        res.json({
            message: isNewUser ? 'Account created successfully' : 'Login successful',
            token: accessToken,
            refreshToken,
            isNewUser,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role_id,
                kyc_status: user.kyc_status,
                kyc_level: user.kyc_level,
                wallet_balance: user.wallet_balance
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Get user with password
        const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        if (user.password_hash === 'GOOGLE_OAUTH') {
            return res.status(400).json({ error: 'Cannot change password for Google OAuth accounts' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and update new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPasswordHash, req.user.id]);

        // Log password change
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) 
       VALUES ($1, 'password_change', 'user', $1, $2)`,
            [req.user.id, req.ip]
        ).catch(console.error);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
