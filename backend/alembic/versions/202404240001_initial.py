"""initial

Revision ID: 202404240001
Revises: 
Create Date: 2024-04-24 16:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '202404240001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('user',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('birth_year', sa.Integer(), nullable=False),
        sa.Column('height_cm', sa.Float(), nullable=False),
        sa.Column('sex', sa.Enum('M', 'F', 'Other', name='sexenum'), nullable=False),
        sa.Column('timezone', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('usergoal',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('direction', sa.Enum('lose', 'maintain', 'gain', name='goaldirection'), nullable=False),
        sa.Column('weekly_rate_kg', sa.Float(), nullable=False),
        sa.Column('tdee_estimate', sa.Float(), nullable=False),
        sa.Column('target_kcal', sa.Float(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('foodlog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('meal_slot', sa.Enum('Breakfast', 'Lunch', 'Dinner', 'Snack', 'PreWorkout', 'PostWorkout', name='mealslot'), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('kcal', sa.Float(), nullable=False),
        sa.Column('protein_g', sa.Float(), nullable=False),
        sa.Column('carbs_g', sa.Float(), nullable=False),
        sa.Column('fat_g', sa.Float(), nullable=False),
        sa.Column('fiber_g', sa.Float(), nullable=True),
        sa.Column('sodium_mg', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('activitylog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('duration_min', sa.Integer(), nullable=False),
        sa.Column('kcal_burned', sa.Float(), nullable=False),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('healthmetric',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('hrv', sa.Float(), nullable=True),
        sa.Column('rhr', sa.Integer(), nullable=True),
        sa.Column('sleep_hours', sa.Float(), nullable=True),
        sa.Column('sleep_quality', sa.Integer(), nullable=True),
        sa.Column('source', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dailysnapshot',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('budget_kcal', sa.Float(), nullable=False),
        sa.Column('consumed_kcal', sa.Float(), nullable=False),
        sa.Column('burned_kcal', sa.Float(), nullable=False),
        sa.Column('net_kcal', sa.Float(), nullable=False),
        sa.Column('balance_kcal', sa.Float(), nullable=False),
        sa.Column('protein_g', sa.Float(), nullable=False),
        sa.Column('carbs_g', sa.Float(), nullable=False),
        sa.Column('fat_g', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'date')
    )

def downgrade() -> None:
    op.drop_table('dailysnapshot')
    op.drop_table('healthmetric')
    op.drop_table('activitylog')
    op.drop_table('foodlog')
    op.drop_table('usergoal')
    op.drop_table('user')
