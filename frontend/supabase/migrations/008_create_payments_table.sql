DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process', 'partial');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('pix', 'credit_card');
    END IF;
END $$;

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id                  uuid primary key DEFAULT gen_random_uuid(),
  user_id             uuid not null REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              numeric(10,2) not null,
  currency            text not null default 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR', 'ARS')),
  status              payment_status_enum not null default 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process', 'partial')),
  payment_method      payment_method_enum not null,
  plan_id             text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  paid_at             timestamptz
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own payments
CREATE POLICY "Users can read their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policy: Service role (webhook) can insert/update payments
CREATE POLICY "Service role can manage payments"
  ON public.payments FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
