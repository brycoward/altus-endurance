"""add auth fields

Revision ID: 202604260002
Revises: 202404240001
Create Date: 2026-04-26 12:56:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '202604260002'
down_revision: Union[str, None] = '202404240001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add columns as nullable first to avoid issues with existing data
    op.add_column('user', sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('user', sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('user', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('user', sa.Column('totp_secret', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('user', sa.Column('is_totp_enabled', sa.Boolean(), nullable=True))
    op.add_column('user', sa.Column('recovery_codes', JSONB(), nullable=True))
    
    # Existing columns from migrate.sql if not already in initial (added manually to User class)
    # op.add_column('user', sa.Column('llm_api_key', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    # op.add_column('user', sa.Column('llm_provider', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    # op.add_column('user', sa.Column('telegram_username', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    # op.add_column('user', sa.Column('telegram_chat_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    # op.add_column('user', sa.Column('bmr_override', sa.Float(), nullable=True))

    # Note: If there are already columns from migrate.sql, we should check.
    # The models.py had them, so I assume they are in the DB or handled by migrate.sql.
    
    # Create index for email
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)
    
    # Set default for is_active and is_totp_enabled
    op.execute("UPDATE \"user\" SET is_active = true, is_totp_enabled = false WHERE is_active IS NULL")

def downgrade() -> None:
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_column('user', 'recovery_codes')
    op.drop_column('user', 'is_totp_enabled')
    op.drop_column('user', 'totp_secret')
    op.drop_column('user', 'is_active')
    op.drop_column('user', 'hashed_password')
    op.drop_column('user', 'email')
