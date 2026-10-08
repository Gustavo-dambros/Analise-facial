"""coupon redemptions (EXPOCEEP)

Revision ID: c3f1e2d4a5b6
Revises: 6ae4f8ffe949
Create Date: 2026-10-08

Cria a tabela coupon_redemptions para cupons promocionais que liberam
avaliacoes extras (ex: EXPOCEEP, valido ate 12/10/2026).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

revision: str = 'c3f1e2d4a5b6'
down_revision: Union[str, None] = '6ae4f8ffe949'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'coupon_redemptions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', PG_UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('granted_analyses', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('redeemed_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['profiles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'code', name='uq_coupon_redemptions_user_code'),
    )
    op.create_index('ix_coupon_redemptions_user_id', 'coupon_redemptions', ['user_id'])
    op.create_index('ix_coupon_redemptions_code', 'coupon_redemptions', ['code'])


def downgrade() -> None:
    op.drop_index('ix_coupon_redemptions_code', table_name='coupon_redemptions')
    op.drop_index('ix_coupon_redemptions_user_id', table_name='coupon_redemptions')
    op.drop_table('coupon_redemptions')
