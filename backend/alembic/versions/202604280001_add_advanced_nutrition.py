"""add_advanced_nutrition

Revision ID: 202604280001
Revises: 1c2453b6d4ac
Create Date: 2026-04-28 17:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '202604280001'
down_revision: Union[str, None] = '1c2453b6d4ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to foodlog
    op.add_column('foodlog', sa.Column('alcohol_g', sa.Float(), nullable=True))
    op.add_column('foodlog', sa.Column('caffeine_mg', sa.Float(), nullable=True))
    op.add_column('foodlog', sa.Column('hydration_ml', sa.Float(), nullable=True))
    op.add_column('foodlog', sa.Column('iron_mg', sa.Float(), nullable=True))
    op.add_column('foodlog', sa.Column('calcium_mg', sa.Float(), nullable=True))
    op.add_column('foodlog', sa.Column('potassium_mg', sa.Float(), nullable=True))
    
    # Add columns to dailysnapshot
    op.add_column('dailysnapshot', sa.Column('fiber_g', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('sodium_mg', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('alcohol_g', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('caffeine_mg', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('hydration_ml', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('iron_mg', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('calcium_mg', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('dailysnapshot', sa.Column('potassium_mg', sa.Float(), server_default='0.0', nullable=False))


def downgrade() -> None:
    # Drop columns from foodlog
    op.drop_column('foodlog', 'alcohol_g')
    op.drop_column('foodlog', 'caffeine_mg')
    op.drop_column('foodlog', 'hydration_ml')
    op.drop_column('foodlog', 'iron_mg')
    op.drop_column('foodlog', 'calcium_mg')
    op.drop_column('foodlog', 'potassium_mg')

    # Drop columns from dailysnapshot
    op.drop_column('dailysnapshot', 'fiber_g')
    op.drop_column('dailysnapshot', 'sodium_mg')
    op.drop_column('dailysnapshot', 'alcohol_g')
    op.drop_column('dailysnapshot', 'caffeine_mg')
    op.drop_column('dailysnapshot', 'hydration_ml')
    op.drop_column('dailysnapshot', 'iron_mg')
    op.drop_column('dailysnapshot', 'calcium_mg')
    op.drop_column('dailysnapshot', 'potassium_mg')
