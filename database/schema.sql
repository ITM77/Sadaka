/*
 * Садака — Database Schema
 * PostgreSQL 14+
 */

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (for fresh setup)
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS savob_history CASCADE;
-- DROP TABLE IF EXISTS savob_points CASCADE;
-- DROP TABLE IF EXISTS reports CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS campaigns CASCADE;
-- DROP TABLE IF EXISTS mosques CASCADE;
-- DROP TABLE IF EXISTS admins CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table (Жертвователи)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(500),
  language VARCHAR(5) DEFAULT 'tj',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- 2. Mosques table (Мечети)
CREATE TABLE IF NOT EXISTS mosques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  imam_name VARCHAR(255),
  imam_phone VARCHAR(20),
  logo_url VARCHAR(500),
  photo_urls TEXT DEFAULT '[]',
  qr_code_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  rating DECIMAL(2, 1) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_mosques_city ON mosques(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_mosques_status ON mosques(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mosques_location ON mosques(latitude, longitude) WHERE deleted_at IS NULL;

-- 3. Campaigns table (Кампании)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(25) DEFAULT 'draft',
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_campaigns_mosque ON campaigns(mosque_id);
CREATE INDEX idx_campaigns_status ON campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_date ON campaigns(start_date, end_date) WHERE deleted_at IS NULL;

-- 4. Transactions table (Транзакции/Пожертвования)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  payment_gateway_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  transaction_hash VARCHAR(255) UNIQUE,
  currency VARCHAR(3) DEFAULT 'TJS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_campaign ON transactions(campaign_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(created_at);

-- 5. Reports table (Отчёты)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_collected DECIMAL(15, 2) NOT NULL,
  expenses TEXT DEFAULT '[]',
  photo_urls TEXT DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_mosque ON reports(mosque_id);
CREATE INDEX idx_reports_status ON reports(status);

-- 6. Savob Points table (Баллы Савоб)
CREATE TABLE IF NOT EXISTS savob_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  points INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_savob_user ON savob_points(user_id);

-- 7. Savob History table
CREATE TABLE IF NOT EXISTS savob_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  points_earned INT NOT NULL,
  multiplier DECIMAL(2, 1) DEFAULT 1.0,
  event_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_savob_history_user ON savob_history(user_id);
CREATE INDEX idx_savob_history_transaction ON savob_history(transaction_id);

-- 8. Admins table (Комитет улемов)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'moderator',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_admins_email ON admins(email);

-- 9. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES admins(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_admin ON notifications(admin_id);
CREATE INDEX idx_notifications_unread ON notifications(is_read, created_at);

-- Views for analytics

-- Campaign progress view
CREATE OR REPLACE VIEW campaign_progress AS
SELECT 
  c.id,
  c.title,
  c.goal_amount,
  c.current_amount,
  ROUND((c.current_amount / NULLIF(c.goal_amount, 0) * 100)::numeric, 2) AS progress_percentage,
  COUNT(t.id) AS donation_count,
  m.name AS mosque_name
FROM campaigns c
LEFT JOIN transactions t ON c.id = t.campaign_id AND t.status = 'completed'
LEFT JOIN mosques m ON c.mosque_id = m.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, m.name;

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  u.id,
  u.full_name,
  u.phone_number,
  COUNT(t.id) AS total_donations,
  COALESCE(SUM(t.amount), 0) AS total_amount,
  COALESCE(sp.total_points, 0) AS savob_points
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
LEFT JOIN savob_points sp ON u.id = sp.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, sp.total_points;

-- Mosque statistics view
CREATE OR REPLACE VIEW mosque_statistics AS
SELECT 
  m.id,
  m.name,
  m.city,
  COUNT(DISTINCT c.id) AS total_campaigns,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) AS active_campaigns,
  COALESCE(SUM(c.current_amount), 0) AS total_collected
FROM mosques m
LEFT JOIN campaigns c ON m.id = c.mosque_id AND c.deleted_at IS NULL
WHERE m.deleted_at IS NULL AND m.status = 'approved'
GROUP BY m.id;

-- Insert sample data for testing (optional)
-- INSERT INTO users (phone_number, full_name, password_hash, language)
-- VALUES ('+992901234567', 'Иброхим Касимов', 'hashed_password', 'tj');

COMMIT;
