"""add_rls_to_recommendations_and_plan_assignments

Revision ID: 6ae4f8ffe949
Revises: 6a431851b724
Create Date: 2026-09-18 20:37:49.387481

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ae4f8ffe949'
down_revision: Union[str, None] = '6a431851b724'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable RLS on recommendations table
    op.execute("ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON recommendations FROM anon, authenticated")
    op.execute("GRANT SELECT, INSERT ON recommendations TO authenticated")
    
    # Users can read their own recommendations
    op.execute("""
        CREATE POLICY "Users can read their own recommendations"
        ON recommendations FOR SELECT TO authenticated
        USING (user_id = auth.uid())
    """)
    
    # Users can create their own recommendations
    op.execute("""
        CREATE POLICY "Users can create their own recommendations"
        ON recommendations FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid())
    """)
    
    # Professionals/admins can read all recommendations
    op.execute("""
        CREATE POLICY "Professionals can read all recommendations"
        ON recommendations FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('professional', 'admin')
            )
        )
    """)
    
    # Enable RLS on plan_assignments table
    op.execute("ALTER TABLE plan_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON plan_assignments FROM anon, authenticated")
    op.execute("GRANT SELECT, INSERT ON plan_assignments TO authenticated")
    
    # Professionals/admins can read their own assignments
    op.execute("""
        CREATE POLICY "Professionals can read their assignments"
        ON plan_assignments FOR SELECT TO authenticated
        USING (
            assigned_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('professional', 'admin')
            )
        )
    """)
    
    # Professionals/admins can create assignments
    op.execute("""
        CREATE POLICY "Professionals can create assignments"
        ON plan_assignments FOR INSERT TO authenticated
        WITH CHECK (
            assigned_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('professional', 'admin')
            )
        )
    """)
    
    # Users can read assignments targeting their email (for apply)
    op.execute("""
        CREATE POLICY "Users can read assignments for their email"
        ON plan_assignments FOR SELECT TO authenticated
        USING (target_email = (SELECT email FROM profiles WHERE id = auth.uid()))
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS \"Users can read their own recommendations\" ON recommendations")
    op.execute("DROP POLICY IF EXISTS \"Users can create their own recommendations\" ON recommendations")
    op.execute("DROP POLICY IF EXISTS \"Professionals can read all recommendations\" ON recommendations")
    op.execute("ALTER TABLE recommendations DISABLE ROW LEVEL SECURITY")
    
    op.execute("DROP POLICY IF EXISTS \"Professionals can read their assignments\" ON plan_assignments")
    op.execute("DROP POLICY IF EXISTS \"Professionals can create assignments\" ON plan_assignments")
    op.execute("DROP POLICY IF EXISTS \"Users can read assignments for their email\" ON plan_assignments")
    op.execute("ALTER TABLE plan_assignments DISABLE ROW LEVEL SECURITY")
