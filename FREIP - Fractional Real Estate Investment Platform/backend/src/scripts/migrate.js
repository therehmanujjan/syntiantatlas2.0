import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * Run database migrations to set up production schema
 */
async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('🔌 Connected to database...');
        console.log('🚀 Starting database migration...\n');

        await client.query('BEGIN');

        // 1. Create roles table
        console.log('📋 Creating roles table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                permissions JSONB DEFAULT '{}',
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert system roles
        console.log('👥 Inserting system roles...');
        await client.query(`
            INSERT INTO roles (id, name, description, permissions, is_system) VALUES
                ('admin', 'Administrator', 'Full system access', '{"all": true}', TRUE),
                ('operations_manager', 'Operations Manager', 'Manage operations', '{"users": ["read", "update"], "properties": ["read", "update", "approve"]}', TRUE),
                ('staff', 'Staff Member', 'Limited access', '{"users": ["read"], "properties": ["read"]}', TRUE),
                ('investor', 'Investor', 'Investment access', '{"properties": ["read"], "investments": ["read", "create"]}', TRUE),
                ('seller', 'Property Seller', 'Property listing access', '{"properties": ["read", "create", "update"]}', TRUE)
            ON CONFLICT (id) DO NOTHING;
        `);

        // 2. Update users table structure
        console.log('👤 Updating users table...');

        // Add missing columns if they don't exist
        const columnsToAdd = [
            { name: 'staff_id', type: 'VARCHAR(50) UNIQUE' },
            { name: 'google_id', type: 'VARCHAR(255) UNIQUE' },
            { name: 'avatar_url', type: 'VARCHAR(500)' },
            { name: 'bank_account', type: 'JSONB' },
            { name: 'status', type: "VARCHAR(50) DEFAULT 'active'" },
            { name: 'last_login_at', type: 'TIMESTAMP' },
            { name: 'password_changed_at', type: 'TIMESTAMP' },
            { name: 'kyc_document', type: 'JSONB' }
        ];

        for (const col of columnsToAdd) {
            try {
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            } catch (e) {
                // Column might already exist
            }
        }

        // 3. Create sessions table
        console.log('🔐 Creating sessions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                refresh_token_hash VARCHAR(255) NOT NULL,
                device_info JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_valid BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        `);

        // 4. Update properties table
        console.log('🏠 Updating properties table...');
        const propertyColumnsToAdd = [
            { name: 'state', type: 'VARCHAR(100)' },
            { name: 'country', type: "VARCHAR(100) DEFAULT 'Pakistan'" },
            { name: 'postal_code', type: 'VARCHAR(20)' },
            { name: 'amenities', type: "JSONB DEFAULT '[]'" },
            { name: 'floor_plan_url', type: 'VARCHAR(500)' },
            { name: 'approved_by', type: 'INT REFERENCES users(id)' },
            { name: 'approved_at', type: 'TIMESTAMP' },
            { name: 'rejection_reason', type: 'TEXT' },
            { name: 'published_at', type: 'TIMESTAMP' },
            { name: 'funding_deadline', type: 'TIMESTAMP' },
            { name: 'spv_id', type: 'VARCHAR(100)' },
            { name: 'documents', type: "JSONB DEFAULT '[]'" },
            { name: 'images', type: "JSONB DEFAULT '[]'" },
            { name: 'video_tour_url', type: 'VARCHAR(500)' }
        ];

        for (const col of propertyColumnsToAdd) {
            try {
                await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            } catch (e) {
                // Column might already exist
            }
        }

        // 5. Update investments table
        console.log('💰 Updating investments table...');
        const investmentColumnsToAdd = [
            { name: 'status', type: "VARCHAR(50) DEFAULT 'active'" },
            { name: 'returns_earned', type: 'DECIMAL(15, 2) DEFAULT 0.00' },
            { name: 'exit_date', type: 'TIMESTAMP' },
            { name: 'exit_amount', type: 'DECIMAL(15, 2)' }
        ];

        for (const col of investmentColumnsToAdd) {
            try {
                await client.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            } catch (e) {
                // Column might already exist
            }
        }

        // 6. Update transactions table
        console.log('💳 Updating transactions table...');
        const transactionColumnsToAdd = [
            { name: 'investment_id', type: 'INT REFERENCES investments(id)' },
            { name: 'fee', type: 'DECIMAL(15, 2) DEFAULT 0.00' },
            { name: 'net_amount', type: 'DECIMAL(15, 2)' },
            { name: 'currency', type: "VARCHAR(10) DEFAULT 'PKR'" },
            { name: 'external_id', type: 'VARCHAR(255)' },
            { name: 'metadata', type: 'JSONB' },
            { name: 'processed_at', type: 'TIMESTAMP' }
        ];

        for (const col of transactionColumnsToAdd) {
            try {
                await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            } catch (e) {
                // Column might already exist
            }
        }

        // 7. Create dividend_distributions table
        console.log('📊 Creating dividend_distributions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS dividend_distributions (
                id SERIAL PRIMARY KEY,
                dividend_id INT NOT NULL REFERENCES dividends(id),
                investor_id INT NOT NULL REFERENCES users(id),
                investment_id INT NOT NULL REFERENCES investments(id),
                shares_held DECIMAL(15, 4),
                amount DECIMAL(15, 2),
                status VARCHAR(50) DEFAULT 'pending',
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_distributions_dividend_id ON dividend_distributions(dividend_id);
            CREATE INDEX IF NOT EXISTS idx_distributions_investor_id ON dividend_distributions(investor_id);
        `);

        // 8. Create KYC verifications table
        console.log('📝 Creating kyc_verifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS kyc_verifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                kyc_level INT,
                verification_type VARCHAR(100),
                document_type VARCHAR(100),
                document_number VARCHAR(100),
                document_front_url VARCHAR(500),
                document_back_url VARCHAR(500),
                selfie_url VARCHAR(500),
                verification_data JSONB,
                status VARCHAR(50) DEFAULT 'pending',
                verified_by INT REFERENCES users(id),
                verified_at TIMESTAMP,
                rejection_reason TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);
        `);

        // 9. Create secondary_market_listings table
        console.log('🏪 Creating secondary_market_listings table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS secondary_market_listings (
                id SERIAL PRIMARY KEY,
                seller_id INT NOT NULL REFERENCES users(id),
                investment_id INT NOT NULL REFERENCES investments(id),
                shares_for_sale DECIMAL(15, 4),
                price_per_share DECIMAL(10, 2),
                total_price DECIMAL(15, 2),
                min_purchase_shares DECIMAL(15, 4),
                listing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expiry_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'active',
                buyer_id INT REFERENCES users(id),
                sold_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON secondary_market_listings(seller_id);
            CREATE INDEX IF NOT EXISTS idx_listings_status ON secondary_market_listings(status);
        `);

        // 10. Create support_tickets table
        console.log('🎫 Creating support_tickets table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                assigned_to INT REFERENCES users(id),
                subject VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                priority VARCHAR(50) DEFAULT 'medium',
                status VARCHAR(50) DEFAULT 'open',
                resolution TEXT,
                first_response_at TIMESTAMP,
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
            CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
        `);

        // 11. Create ticket_messages table
        console.log('💬 Creating ticket_messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ticket_messages (
                id SERIAL PRIMARY KEY,
                ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(id),
                message TEXT NOT NULL,
                attachments JSONB DEFAULT '[]',
                is_internal BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
        `);

        // 12. Create notifications table
        console.log('🔔 Creating notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                data JSONB,
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        `);

        // 13. Ensure audit_logs table exists
        console.log('📋 Creating audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                action VARCHAR(255) NOT NULL,
                entity_type VARCHAR(100),
                entity_id INT,
                old_values JSONB,
                new_values JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                request_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
        `);

        // 14. Create referrals table
        console.log('🎁 Creating referrals table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id INT NOT NULL REFERENCES users(id),
                referred_id INT REFERENCES users(id),
                referral_code VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                reward_amount DECIMAL(15, 2),
                rewarded_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
            CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
        `);

        // 15. Create system_settings table
        console.log('⚙️ Creating system_settings table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB NOT NULL,
                description TEXT,
                updated_by INT REFERENCES users(id),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            INSERT INTO system_settings (key, value, description) VALUES
                ('platform_fee_percentage', '2.5', 'Platform fee percentage'),
                ('min_investment_amount', '10000', 'Minimum investment (PKR)'),
                ('max_investment_amount', '50000000', 'Maximum investment (PKR)'),
                ('maintenance_mode', 'false', 'Maintenance mode flag')
            ON CONFLICT (key) DO NOTHING;
        `);

        // 16. Create/Update admin user
        console.log('👑 Setting up admin user...');
        const adminPassword = 'SecureAdmin2024!';
        const adminHash = await bcrypt.hash(adminPassword, 10);

        const adminResult = await client.query('SELECT id FROM users WHERE email = $1', ['admin@freip.com']);

        if (adminResult.rows.length > 0) {
            await client.query(
                `UPDATE users SET 
                    password_hash = $1, 
                    role_id = 'admin', 
                    kyc_status = 'verified', 
                    kyc_level = 3, 
                    status = 'active',
                    updated_at = CURRENT_TIMESTAMP 
                 WHERE email = 'admin@freip.com'`,
                [adminHash]
            );
            console.log('   ✅ Admin user updated');
        } else {
            await client.query(
                `INSERT INTO users (email, password_hash, first_name, last_name, role_id, kyc_status, kyc_level, status)
                 VALUES ('admin@freip.com', $1, 'Super', 'Admin', 'admin', 'verified', 3, 'active')`,
                [adminHash]
            );
            console.log('   ✅ Admin user created');
        }

        // 17. Remove test/seed data
        console.log('🧹 Cleaning up test data...');
        await client.query(`DELETE FROM users WHERE email IN ('seller@freip.com', 'staff@freip.com', 'investor@freip.com')`);

        await client.query('COMMIT');

        console.log('\n✅ Database migration completed successfully!');
        console.log('\n📝 Admin Credentials:');
        console.log('   Email: admin@freip.com');
        console.log('   Password: SecureAdmin2024!');
        console.log('\n⚠️  Please change the admin password after first login!\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
});
