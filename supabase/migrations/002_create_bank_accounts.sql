-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_type VARCHAR(50) NOT NULL DEFAULT 'transactions', -- transactions, expenses, savings, emergency, fun
  account_number_last4 VARCHAR(4), -- Last 4 digits for display
  currency VARCHAR(3) DEFAULT 'AUD',
  color VARCHAR(7), -- Hex color for UI
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

-- Function to update updated_at timestamp (create if it doesn't exist)
-- Using SECURITY DEFINER and setting search_path for security
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

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
