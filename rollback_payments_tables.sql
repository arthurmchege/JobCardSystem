-- ============================================
-- ROLLBACK: M-PESA PAYMENTS INTEGRATION
-- Database: jobcards
-- Date: 2026-03-10
-- ============================================

-- Remove indexes from job_cards
DROP INDEX IF EXISTS idx_job_payment_status;
DROP INDEX IF EXISTS idx_job_payment_due;

-- Remove payment columns from job_cards
ALTER TABLE job_cards DROP COLUMN IF EXISTS payment_status;
ALTER TABLE job_cards DROP COLUMN IF EXISTS payment_amount;
ALTER TABLE job_cards DROP COLUMN IF EXISTS outstanding_balance;
ALTER TABLE job_cards DROP COLUMN IF EXISTS payment_terms;
ALTER TABLE job_cards DROP COLUMN IF EXISTS payment_due_date;
ALTER TABLE job_cards DROP COLUMN IF EXISTS fully_paid_at;
ALTER TABLE job_cards DROP COLUMN IF EXISTS last_payment_id;

-- Drop payments table (this also drops its indexes and trigger)
DROP TABLE IF EXISTS payments;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================
