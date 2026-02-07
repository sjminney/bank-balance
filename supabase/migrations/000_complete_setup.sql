-- Complete Database Setup for Bank Balance App
-- Run this single migration to set up everything

-- ============================================
-- 1. Create monthly_balances table
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  balance NUMERIC(15, 2) NOT NULL,
  interest_earned NUMERIC(15, 2) NOT NULL DEFAULT 0,
  one_off_deposit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_balances_user_id ON monthly_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_balances_month_year ON monthly_balances(month_year DESC);

-- Enable Row Level Security
ALTER TABLE monthly_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own monthly balance data
CREATE POLICY "Users can view their own monthly balances"
  ON monthly_balances
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own monthly balance data
CREATE POLICY "Users can insert their own monthly balances"
  ON monthly_balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own monthly balance data
CREATE POLICY "Users can update their own monthly balances"
  ON monthly_balances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own monthly balance data
CREATE POLICY "Users can delete their own monthly balances"
  ON monthly_balances
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Create bank_accounts table
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_type VARCHAR(50) NOT NULL DEFAULT 'transactions',
  account_number_last4 VARCHAR(4),
  currency VARCHAR(3) DEFAULT 'AUD',
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Enable Row Level Security
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own bank accounts
CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own bank accounts
CREATE POLICY "Users can insert their own bank accounts"
  ON bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own bank accounts
CREATE POLICY "Users can update their own bank accounts"
  ON bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own bank accounts
CREATE POLICY "Users can delete their own bank accounts"
  ON bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Create update_updated_at_column function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. Add bank_account_id to monthly_balances
-- ============================================
ALTER TABLE monthly_balances 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_balances_bank_account_id ON monthly_balances(bank_account_id);

-- Update unique constraint to allow multiple balances per month for different accounts
-- Drop old constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_balances_user_id_month_year_key'
  ) THEN
    ALTER TABLE monthly_balances DROP CONSTRAINT monthly_balances_user_id_month_year_key;
  END IF;
END $$;

-- Drop any existing unique index
DROP INDEX IF EXISTS monthly_balances_user_month_account_unique;

-- Add new unique constraint that includes bank_account_id
CREATE UNIQUE INDEX IF NOT EXISTS monthly_balances_user_month_account_unique 
ON monthly_balances(
  user_id, 
  month_year, 
  COALESCE(bank_account_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================
-- 5. Create triggers for updated_at
-- ============================================
-- Trigger for monthly_balances
DROP TRIGGER IF EXISTS update_monthly_balances_updated_at ON monthly_balances;
CREATE TRIGGER update_monthly_balances_updated_at
  BEFORE UPDATE ON monthly_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bank_accounts
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Create monthly_incomes table
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user_id ON monthly_incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_incomes_month_year ON monthly_incomes(month_year DESC);

ALTER TABLE monthly_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly incomes"
  ON monthly_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own monthly incomes"
  ON monthly_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monthly incomes"
  ON monthly_incomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monthly incomes"
  ON monthly_incomes FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_monthly_incomes_updated_at ON monthly_incomes;
CREATE TRIGGER update_monthly_incomes_updated_at
  BEFORE UPDATE ON monthly_incomes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
