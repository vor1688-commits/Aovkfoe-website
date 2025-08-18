-- สำหรับตาราง bills (สำคัญที่สุด)
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_lotto_round_id ON bills(lotto_round_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_bet_name ON bills(bet_name);

-- สำหรับตาราง bet_items
CREATE INDEX IF NOT EXISTS idx_bet_items_bill_entry_id ON bet_items(bill_entry_id);
CREATE INDEX IF NOT EXISTS idx_bet_items_bet_number ON bet_items(bet_number);