-- Move interest earned from monthly_incomes to monthly_balances (per account per month)
ALTER TABLE monthly_balances
ADD COLUMN IF NOT EXISTS interest_earned NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN monthly_balances.interest_earned IS 'Interest earned this month for this bank account ($).';

-- Remove interest from monthly_incomes (now on balances)
ALTER TABLE monthly_incomes
DROP COLUMN IF EXISTS interest_earned;
