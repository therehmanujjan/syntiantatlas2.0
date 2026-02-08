
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'freip_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'freip_db',
    password: process.env.DB_PASSWORD || 'freip_password',
    port: process.env.DB_PORT || 5432,
});

async function resetAdminPassword() {
    try {
        const email = 'admin@freip.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin exists
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (res.rows.length > 0) {
            // Update password
            await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
            console.log(`✅ Password updated for ${email}`);
        } else {
            // Create admin if not exists
            await pool.query(
                'INSERT INTO users (first_name, last_name, email, password, role_id, phone) VALUES ($1, $2, $3, $4, $5, $6)',
                ['Super', 'Admin', email, hashedPassword, 'admin', '0000000000']
            );
            console.log(`✅ Admin user created: ${email}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error resetting password:', err);
        process.exit(1);
    }
}

resetAdminPassword();
