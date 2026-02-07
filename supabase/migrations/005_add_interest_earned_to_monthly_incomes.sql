-- Add interest earned per month (not per account)
ALTER TABLE monthly_incomes
ADD COLUMN IF NOT EXISTS interest_earned NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN monthly_incomes.interest_earned IS 'Interest earned this month; not linked to any account.';
