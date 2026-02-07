-- Monthly income per user per month (one row per user per month)
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
