CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_name TEXT NOT NULL,
  category TEXT,
  asset_code TEXT NOT NULL UNIQUE,
  condition TEXT,
  availability TEXT NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.borrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  borrower_type TEXT NOT NULL,
  department TEXT,
  date_borrowed DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  date_returned DATE,
  status TEXT NOT NULL DEFAULT 'Borrowed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_borrow_transactions_equipment_id ON public.borrow_transactions(equipment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_transactions TO authenticated;
GRANT ALL ON public.borrow_transactions TO service_role;

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users manage equipment" ON public.equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Signed-in users manage transactions" ON public.borrow_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);