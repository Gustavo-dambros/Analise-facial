"""cakto integration

Revision ID: b7e8c9d0a1f2
Revises: 9a1b2c3d4e5f
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b7e8c9d0a1f2'
down_revision: Union[str, None] = '9a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add enum value 'cakto' to paymentmethod if not exists (Postgres)
    # Use DO block to avoid error if already exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'cakto'
                AND enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'paymentmethod'
                )
            ) THEN
                ALTER TYPE paymentmethod ADD VALUE 'cakto';
            END IF;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END
        $$;
    """)
    # Also handle supabase naming payment_method_enum
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum
                    WHERE enumlabel = 'cakto'
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method_enum')
                ) THEN
                    ALTER TYPE payment_method_enum ADD VALUE 'cakto';
                END IF;
            END IF;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END
        $$;
    """)

    # Alter cakto columns to VARCHAR(255) if they exist as 100, and add offer_id
    # Add offer_id
    op.add_column('payments', sa.Column('offer_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_payments_offer_id'), 'payments', ['offer_id'], unique=False)

    # Ensure cakto_payment_id exists with correct length (alter if needed)
    # If column already exists, alter type to 255
    try:
        op.alter_column('payments', 'cakto_payment_id', existing_type=sa.String(length=100), type_=sa.String(length=255), existing_nullable=True)
    except Exception:
        pass
    try:
        op.alter_column('payments', 'cakto_preference_id', existing_type=sa.String(length=100), type_=sa.String(length=255), existing_nullable=True)
    except Exception:
        pass
    # Create indexes if not exists (may already exist)
    try:
        op.create_index(op.f('ix_payments_cakto_payment_id'), 'payments', ['cakto_payment_id'], unique=False)
    except Exception:
        pass
    try:
        op.create_index(op.f('ix_payments_cakto_preference_id'), 'payments', ['cakto_preference_id'], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_offer_id'), table_name='payments')
    op.drop_column('payments', 'offer_id')
    # Note: cannot remove enum value safely; left as-is
