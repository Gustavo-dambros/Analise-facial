"""add recommendations and plan_assignments tables

Revision ID: 6a431851b724
Revises: b7e8c9d0a1f2
Create Date: 2026-09-16 14:12:32.142347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6a431851b724'
down_revision: Union[str, None] = 'b7e8c9d0a1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id'), nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_recommendations_user_id', 'recommendations', ['user_id'])
    op.create_index('ix_recommendations_status', 'recommendations', ['status'])

    # Create plan_assignments table
    op.create_table(
        'plan_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id'), nullable=False, index=True),
        sa.Column('target_email', sa.String(255), nullable=False, index=True),
        sa.Column('target_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id'), nullable=True, index=True),
        sa.Column('plan_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_plan_assignments_assigned_by', 'plan_assignments', ['assigned_by'])
    op.create_index('ix_plan_assignments_target_email', 'plan_assignments', ['target_email'])
    op.create_index('ix_plan_assignments_status', 'plan_assignments', ['status'])


def downgrade() -> None:
    op.drop_index('ix_plan_assignments_status', table_name='plan_assignments')
    op.drop_index('ix_plan_assignments_target_email', table_name='plan_assignments')
    op.drop_index('ix_plan_assignments_assigned_by', table_name='plan_assignments')
    op.drop_table('plan_assignments')
    op.drop_index('ix_recommendations_status', table_name='recommendations')
    op.drop_index('ix_recommendations_user_id', table_name='recommendations')
    op.drop_table('recommendations')