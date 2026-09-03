"""add mp fields to payments

Revision ID: 9a1b2c3d4e5f
Revises: 047cebab951d
Create Date: 2026-09-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, None] = '047cebab951d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('payments', sa.Column('mp_payment_id', sa.String(length=100), nullable=True))
    op.add_column('payments', sa.Column('mp_preference_id', sa.String(length=100), nullable=True))
    op.add_column('payments', sa.Column('plan_type', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_payments_mp_payment_id'), 'payments', ['mp_payment_id'], unique=False)
    op.create_index(op.f('ix_payments_mp_preference_id'), 'payments', ['mp_preference_id'], unique=False)
    op.create_index(op.f('ix_payments_plan_type'), 'payments', ['plan_type'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_payments_plan_type'), table_name='payments')
    op.drop_index(op.f('ix_payments_mp_preference_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_mp_payment_id'), table_name='payments')
    op.drop_column('payments', 'plan_type')
    op.drop_column('payments', 'mp_preference_id')
    op.drop_column('payments', 'mp_payment_id')
