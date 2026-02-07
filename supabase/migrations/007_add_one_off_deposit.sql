-- One-off deposits (e.g. inheritance, bonus) - excluded from expenses calculation
ALTER TABLE monthly_balances
ADD COLUMN IF NOT EXISTS one_off_deposit NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN monthly_balances.one_off_deposit IS 'One-off deposit this month for this account ($). Excluded from expenses/savings calculation.';
