-- Add bank_account_id to monthly_balances table
ALTER TABLE monthly_balances 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_balances_bank_account_id ON monthly_balances(bank_account_id);

-- Update unique constraint to allow multiple balances per month for different accounts
-- First, drop the old constraint if it exists (try different possible names)
DO $$ 
BEGIN
  -- Try to drop constraint by name
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_balances_user_id_month_year_key'
  ) THEN
    ALTER TABLE monthly_balances DROP CONSTRAINT monthly_balances_user_id_month_year_key;
  END IF;
END $$;

-- Drop any existing unique index on user_id and month_year
DROP INDEX IF EXISTS monthly_balances_user_month_account_unique;

-- Add new unique constraint that includes bank_account_id
-- This allows one balance per user per month per account
-- For NULL bank_account_id, we use a special UUID to allow one "general" balance per month
CREATE UNIQUE INDEX IF NOT EXISTS monthly_balances_user_month_account_unique 
ON monthly_balances(
  user_id, 
  month_year, 
  COALESCE(bank_account_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
