-- ============================================
-- FREIP Production Database Schema
-- Fractional Real Estate Investment Platform
-- ============================================
-- Version: 1.0.0
-- Updated: 2026-02-09
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert system roles
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 
   '{"users": ["read", "create", "update", "delete"], "properties": ["read", "create", "update", "delete", "approve"], "investments": ["read", "create", "update"], "transactions": ["read", "create", "update"], "settings": ["read", "update"], "reports": ["read", "export"]}', 
   TRUE),
  ('operations_manager', 'Operations Manager', 'Manage day-to-day operations, KYC, and support',
   '{"users": ["read", "update"], "properties": ["read", "update", "approve"], "investments": ["read"], "transactions": ["read"], "kyc": ["read", "verify"], "support": ["read", "update"]}',
   TRUE),
  ('staff', 'Staff Member', 'Limited administrative access',
   '{"users": ["read"], "properties": ["read"], "investments": ["read"], "transactions": ["read"], "support": ["read", "update"]}',
   TRUE),
  ('investor', 'Investor', 'Investment and portfolio management',
   '{"properties": ["read"], "investments": ["read", "create"], "transactions": ["read", "create"], "portfolio": ["read"]}',
   TRUE),
  ('seller', 'Property Seller', 'Property listing and management',
   '{"properties": ["read", "create", "update"], "transactions": ["read"]}',
   TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role_id VARCHAR(50) DEFAULT 'investor' REFERENCES roles(id),
  staff_id VARCHAR(50) UNIQUE, -- Auto-generated for staff accounts
  google_id VARCHAR(255) UNIQUE, -- For Google OAuth users
  avatar_url VARCHAR(500),
  kyc_status VARCHAR(50) DEFAULT 'pending',
  kyc_level INT DEFAULT 1,
  kyc_document JSONB,
  wallet_balance DECIMAL(15, 2) DEFAULT 0.00,
  bank_account JSONB,
  status VARCHAR(50) DEFAULT 'active',
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_kyc_status CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  CONSTRAINT check_user_status CHECK (status IN ('active', 'suspended', 'banned', 'pending_verification'))
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);

-- ============================================
-- 3. SESSIONS TABLE (for secure session management)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- 4. PROPERTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location JSONB, -- {lat, lng, formatted_address}
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Pakistan',
  postal_code VARCHAR(20),
  property_type VARCHAR(50),
  area_sqft DECIMAL(10, 2),
  total_value DECIMAL(15, 2),
  funding_target DECIMAL(15, 2),
  funding_raised DECIMAL(15, 2) DEFAULT 0.00,
  min_investment DECIMAL(15, 2),
  max_investment DECIMAL(15, 2),
  expected_returns_annual DECIMAL(5, 2),
  rental_yield DECIMAL(5, 2),
  status VARCHAR(50) DEFAULT 'draft',
  spv_id VARCHAR(100), -- Special Purpose Vehicle ID
  documents JSONB DEFAULT '[]', -- Array of document URLs
  images JSONB DEFAULT '[]', -- Array of image URLs
  video_tour_url VARCHAR(500),
  amenities JSONB DEFAULT '[]',
  floor_plan_url VARCHAR(500),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  published_at TIMESTAMP,
  funding_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_property_status CHECK (status IN ('draft', 'pending', 'active', 'funded', 'closed', 'rejected')),
  CONSTRAINT check_property_type CHECK (property_type IN ('residential', 'commercial', 'industrial', 'mixed_use', 'land', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_properties_seller_id ON properties(seller_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- ============================================
-- 5. INVESTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  investor_id INT NOT NULL REFERENCES users(id),
  property_id INT NOT NULL REFERENCES properties(id),
  amount_invested DECIMAL(15, 2) NOT NULL,
  shares_owned DECIMAL(15, 4),
  ownership_percentage DECIMAL(5, 4),
  investment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  returns_earned DECIMAL(15, 2) DEFAULT 0.00,
  exit_date TIMESTAMP,
  exit_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_investment_status CHECK (status IN ('active', 'exited', 'cancelled', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_property_id ON investments(property_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(investment_date);

-- ============================================
-- 6. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  investment_id INT REFERENCES investments(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0.00,
  net_amount DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'PKR',
  status VARCHAR(50) DEFAULT 'pending',
  gateway VARCHAR(50),
  payment_method VARCHAR(50),
  reference_number VARCHAR(255) UNIQUE,
  external_id VARCHAR(255), -- Gateway transaction ID
  description TEXT,
  metadata JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_transaction_type CHECK (type IN ('deposit', 'withdrawal', 'investment', 'dividend', 'refund', 'fee', 'bonus')),
  CONSTRAINT check_transaction_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_number);

-- ============================================
-- 7. DIVIDENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dividends (
  id SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id),
  quarter INT,
  year INT,
  total_rental_income DECIMAL(15, 2),
  operating_expenses DECIMAL(15, 2),
  management_fee DECIMAL(15, 2),
  total_expenses DECIMAL(15, 2),
  net_income DECIMAL(15, 2),
  distribution_per_share DECIMAL(10, 4),
  distribution_date DATE,
  status VARCHAR(50) DEFAULT 'scheduled',
  distributed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_dividend_status CHECK (status IN ('scheduled', 'processing', 'distributed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_dividends_property_id ON dividends(property_id);
CREATE INDEX IF NOT EXISTS idx_dividends_date ON dividends(distribution_date);

-- ============================================
-- 8. DIVIDEND DISTRIBUTIONS TABLE (per investor)
-- ============================================
CREATE TABLE IF NOT EXISTS dividend_distributions (
  id SERIAL PRIMARY KEY,
  dividend_id INT NOT NULL REFERENCES dividends(id),
  investor_id INT NOT NULL REFERENCES users(id),
  investment_id INT NOT NULL REFERENCES investments(id),
  shares_held DECIMAL(15, 4),
  amount DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_distribution_status CHECK (status IN ('pending', 'paid', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_distributions_dividend_id ON dividend_distributions(dividend_id);
CREATE INDEX IF NOT EXISTS idx_distributions_investor_id ON dividend_distributions(investor_id);

-- ============================================
-- 9. KYC VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  kyc_level INT,
  verification_type VARCHAR(100), -- 'identity', 'address', 'bank', 'accredited_investor'
  document_type VARCHAR(100), -- 'cnic', 'passport', 'utility_bill', 'bank_statement'
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_kyc_verification_status CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);

-- ============================================
-- 10. SECONDARY MARKET LISTINGS TABLE
-- ============================================
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_listing_status CHECK (status IN ('active', 'sold', 'partially_sold', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON secondary_market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON secondary_market_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_investment_id ON secondary_market_listings(investment_id);

-- ============================================
-- 11. SUPPORT TICKETS TABLE
-- ============================================
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_ticket_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT check_ticket_status CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- ============================================
-- 12. TICKET MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes visible only to staff
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ============================================
-- 13. NOTIFICATIONS TABLE
-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- 14. AUDIT LOGS TABLE
-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- ============================================
-- 15. REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INT NOT NULL REFERENCES users(id),
  referred_id INT REFERENCES users(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reward_amount DECIMAL(15, 2),
  rewarded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_referral_status CHECK (status IN ('pending', 'registered', 'qualified', 'rewarded', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ============================================
-- 16. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('platform_fee_percentage', '2.5', 'Platform fee percentage on investments'),
  ('min_investment_amount', '10000', 'Minimum investment amount in PKR'),
  ('max_investment_amount', '50000000', 'Maximum investment amount in PKR'),
  ('kyc_expiry_days', '365', 'Number of days until KYC verification expires'),
  ('referral_reward_amount', '500', 'Referral reward amount in PKR'),
  ('maintenance_mode', 'false', 'System maintenance mode flag')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ADMIN USER SETUP
-- ============================================
-- Insert the hardcoded admin user
-- Password: SecureAdmin2024! (bcrypt hash generated with cost 10)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, kyc_status, kyc_level, status)
VALUES (
  'admin@freip.com',
  '$2b$10$rJqHphzDx6LE/VKj0gOVQe5Xj5.VqP5nSjHJxYPXKJXxYsHQjZXVe',
  'Super',
  'Admin',
  'admin',
  'verified',
  3,
  'active'
) ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2b$10$rJqHphzDx6LE/VKj0gOVQe5Xj5.VqP5nSjHJxYPXKJXxYsHQjZXVe',
  role_id = 'admin',
  kyc_status = 'verified',
  kyc_level = 3,
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('users', 'properties', 'investments', 'transactions', 'kyc_verifications', 'support_tickets', 'secondary_market_listings')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$ language 'plpgsql';

-- ============================================
-- CLEANUP OLD TEST DATA (run manually if needed)
-- ============================================
-- DELETE FROM users WHERE email IN ('seller@freip.com', 'staff@freip.com', 'investor@freip.com');
-- DELETE FROM properties WHERE title LIKE '%Test%' OR title LIKE '%Demo%';
-- DELETE FROM investments WHERE amount_invested < 100;
