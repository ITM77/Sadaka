# 📊 Схема БД Садака

## PostgreSQL Tables

### 1. Users (Жертвователи)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(500),
  language VARCHAR(5) DEFAULT 'tj', -- tajik, russian, english
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 2. Mosques (Мечети)
```sql
CREATE TABLE mosques (
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
  photo_urls TEXT[], -- JSON array
  qr_code_url VARCHAR(500),
  status ENUM('pending', 'approved', 'rejected', 'blocked') DEFAULT 'pending',
  rating DECIMAL(2, 1) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### 3. Campaigns (Кампании)
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status ENUM('draft', 'pending_approval', 'approved', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  category VARCHAR(100), -- repairs, education, welfare, etc
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);
```

### 4. Transactions (Транзакции)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method ENUM('card', 'mobile_wallet', 'qr', 'bank_transfer') NOT NULL,
  payment_gateway_id VARCHAR(255), -- stripe, alif, imon
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_hash VARCHAR(255) UNIQUE,
  currency VARCHAR(3) DEFAULT 'TJS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);
```

### 5. Reports (Отчёты мечетей)
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  mosque_id UUID NOT NULL REFERENCES mosques(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_collected DECIMAL(15, 2) NOT NULL,
  expenses TEXT, -- JSON: [{item: "...", cost: 100}, ...]
  photos TEXT[], -- JSON array of photo URLs
  status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);
```

### 6. Savob Points (Баллы Савоб)
```sql
CREATE TABLE savob_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  points INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0, -- всего накоплено
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id)
);
```

### 7. Savob History (История начисления Савоб)
```sql
CREATE TABLE savob_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  points_earned INT NOT NULL,
  multiplier DECIMAL(2, 1) DEFAULT 1.0, -- 1.0, 2.0 (Рамадан), 3.0 (особые события)
  event_type VARCHAR(100), -- 'regular', 'ramadan', 'kurban', 'special_event'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES savob_points(user_id)
);
```

### 8. Admins (Комитет улемов)
```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'moderator', 'analyst') DEFAULT 'moderator',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

### 9. Notifications (Уведомления)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES admins(id),
  type VARCHAR(50), -- 'campaign_approved', 'payment_received', 'report_submitted', etc
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);
```

## Indexes

```sql
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_mosques_city ON mosques(city);
CREATE INDEX idx_campaigns_mosque ON campaigns(mosque_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_campaign ON transactions(campaign_id);
CREATE INDEX idx_savob_user ON savob_points(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

## Views (Представления)

### Campaign Progress View
```sql
CREATE VIEW campaign_progress AS
SELECT 
  c.id,
  c.title,
  c.goal_amount,
  c.current_amount,
  ROUND((c.current_amount / c.goal_amount * 100)::numeric, 2) AS progress_percentage,
  COUNT(t.id) AS donation_count,
  m.name AS mosque_name
FROM campaigns c
LEFT JOIN transactions t ON c.id = t.campaign_id AND t.status = 'completed'
LEFT JOIN mosques m ON c.mosque_id = m.id
GROUP BY c.id, m.name;
```

### User Giving Statistics
```sql
CREATE VIEW user_statistics AS
SELECT 
  u.id,
  u.full_name,
  COUNT(t.id) AS total_donations,
  SUM(t.amount) AS total_amount,
  sp.total_points AS savob_points
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
LEFT JOIN savob_points sp ON u.id = sp.user_id
GROUP BY u.id, sp.total_points;
```

## Enum Types

```sql
CREATE TYPE user_status AS ENUM ('active', 'blocked', 'deleted');
CREATE TYPE mosque_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');
CREATE TYPE campaign_status_enum AS ENUM ('draft', 'pending_approval', 'approved', 'active', 'completed', 'cancelled');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('card', 'mobile_wallet', 'qr', 'bank_transfer');
CREATE TYPE admin_role_enum AS ENUM ('superadmin', 'moderator', 'analyst');
```
