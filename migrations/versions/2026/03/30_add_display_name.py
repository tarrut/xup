"""add display_name to users

Revision ID: b7d3e9f1a2c4
Revises: 3f8b1c2d4e5a
Create Date: 2026-03-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b7d3e9f1a2c4'
down_revision: Union[str, Sequence[str], None] = '3f8b1c2d4e5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('display_name', sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'display_name')
