"""initial

Revision ID: a647a5ab35e3
Revises:
Create Date: 2026-03-28 19:16:51.368004

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a647a5ab35e3"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("username", sa.String(32), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("shots_won", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shots_lost", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "parties",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("host_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["host_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_parties_code", "parties", ["code"], unique=True)

    op.create_table(
        "party_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("party_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["party_id"], ["parties.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("party_id", "user_id"),
    )

    op.create_table(
        "challenges",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("party_id", sa.String(), nullable=False),
        sa.Column("challenger_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("shots", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("winner_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["challenger_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["party_id"], ["parties.id"]),
        sa.ForeignKeyConstraint(["target_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["winner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("challenges")
    op.drop_table("party_members")
    op.drop_index("ix_parties_code", table_name="parties")
    op.drop_table("parties")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
