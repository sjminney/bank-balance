-- Create monthly_balances table
CREATE TABLE IF NOT EXISTS monthly_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  balance NUMERIC(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, month_year)
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

-- Function to update updated_at timestamp
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
CREATE TRIGGER update_monthly_balances_updated_at
  BEFORE UPDATE ON monthly_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
