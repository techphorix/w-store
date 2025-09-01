-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('deposit', 'withdrawal', 'both') NOT NULL DEFAULT 'both',
  description TEXT,
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  processing_time VARCHAR(100) DEFAULT '1-3 business days',
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_amount DECIMAL(10,2) DEFAULT 999999.99,
  fees_percentage DECIMAL(5,2) DEFAULT 0,
  fees_fixed DECIMAL(10,2) DEFAULT 0,
  requires_verification BOOLEAN DEFAULT FALSE,
  verification_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create withdrawal methods table
CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('bank_transfer', 'paypal', 'stripe', 'crypto', 'check', 'other') NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  processing_time VARCHAR(100) DEFAULT '1-3 business days',
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_amount DECIMAL(10,2) DEFAULT 999999.99,
  fees_percentage DECIMAL(5,2) DEFAULT 0,
  fees_fixed DECIMAL(10,2) DEFAULT 0,
  requires_verification BOOLEAN DEFAULT FALSE,
  verification_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  INDEX idx_type (type),
  INDEX idx_active (is_active),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default payment methods
INSERT INTO payment_methods (id, name, type, description, icon, processing_time, min_amount, max_amount, fees_percentage, fees_fixed) VALUES
(UUID(), 'Bank Account', 'both', 'Direct bank transfer for deposits and withdrawals', 'fa-university', '1-3 business days', 10.00, 50000.00, 0.00, 0.00),
(UUID(), 'PayPal', 'both', 'PayPal integration for instant transfers', 'fa-paypal', 'Instant', 10.00, 10000.00, 2.90, 0.30),
(UUID(), 'Stripe', 'both', 'Stripe payment processing', 'fa-credit-card', 'Instant', 10.00, 50000.00, 2.90, 0.30);

-- Insert default withdrawal methods
INSERT INTO withdrawal_methods (id, name, type, description, icon, processing_time, min_amount, max_amount, fees_percentage, fees_fixed) VALUES
(UUID(), 'Bank Transfer', 'bank_transfer', 'Direct bank transfer to your account', 'fa-university', '1-3 business days', 50.00, 50000.00, 0.00, 0.00),
(UUID(), 'PayPal', 'paypal', 'Withdraw to your PayPal account', 'fa-paypal', 'Instant', 50.00, 10000.00, 2.90, 0.30),
(UUID(), 'Stripe', 'stripe', 'Withdraw to your Stripe account', 'fa-credit-card', '1-2 business days', 50.00, 50000.00, 0.00, 0.00);
