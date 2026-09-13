-- Cakto integration: add 'cakto' to payment_method_enum and add cakto/offer columns
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'cakto'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method_enum')
    ) THEN
        ALTER TYPE payment_method_enum ADD VALUE 'cakto';
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fallback for paymentmethod (alembic naming)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentmethod') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'cakto'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentmethod')
        ) THEN
            ALTER TYPE paymentmethod ADD VALUE 'cakto';
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cakto_payment_id VARCHAR(255);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cakto_preference_id VARCHAR(255);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS offer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payments_cakto_payment_id ON public.payments(cakto_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_offer_id ON public.payments(offer_id);
