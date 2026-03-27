-- ============================================
-- M-PESA PAYMENTS INTEGRATION
-- Migration: Create payments table and add payment columns to job_cards
-- Database: jobcards
-- Date: 2026-03-10
-- Author: Arthur Mulunda
-- ============================================

-- ============================================
-- CREATE PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE RESTRICT,
    
    -- Customer Info
    phone_number VARCHAR(20) NOT NULL,
    
    -- Amounts
    amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2),
    
    -- M-Pesa Tracking
    checkout_request_id VARCHAR(255) UNIQUE,
    mpesa_receipt_number VARCHAR(50),
    account_reference VARCHAR(100),
    
    -- Status
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result_code INTEGER,
    result_description TEXT,
    
    -- Flags
    is_duplicate BOOLEAN DEFAULT FALSE,
    requires_review BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    payment_initiated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_completed TIMESTAMP,
    transaction_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE TRIGGER FOR AUTO-UPDATE
-- (matching your existing tables pattern)
-- ============================================

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE INDEXES ON PAYMENTS TABLE
-- ============================================

CREATE INDEX idx_payments_job_card ON payments(job_card_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_receipt ON payments(mpesa_receipt_number);
CREATE INDEX idx_payments_status_created ON payments(payment_status, created_at);

-- ============================================
-- ADD PAYMENT COLUMNS TO JOB_CARDS TABLE
-- ============================================

ALTER TABLE job_cards ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid';
ALTER TABLE job_cards ADD COLUMN payment_amount DECIMAL(10, 2);
ALTER TABLE job_cards ADD COLUMN outstanding_balance DECIMAL(10, 2);
ALTER TABLE job_cards ADD COLUMN payment_terms VARCHAR(20);
ALTER TABLE job_cards ADD COLUMN payment_due_date DATE;
ALTER TABLE job_cards ADD COLUMN fully_paid_at TIMESTAMP;
ALTER TABLE job_cards ADD COLUMN last_payment_id UUID REFERENCES payments(id);

-- ============================================
-- CREATE INDEXES ON JOB_CARDS (new columns)
-- ============================================

CREATE INDEX idx_job_payment_status ON job_cards(payment_status);
CREATE INDEX idx_job_payment_due ON job_cards(payment_status, payment_due_date);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

