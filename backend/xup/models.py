import random
import string
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from xup.database import Base

def _uuid() -> str:
    return str(uuid.uuid4())

def _party_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=6))

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    shots_won: Mapped[int] = mapped_column(Integer, default=0)
    shots_lost: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    memberships: Mapped[list["PartyMember"]] = relationship(back_populates="user")

class Party(Base):
    __tablename__ = "parties"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False, index=True, default=_party_code)
    host_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    host: Mapped["User"] = relationship(foreign_keys=[host_id])
    members: Mapped[list["PartyMember"]] = relationship(back_populates="party", cascade="all, delete-orphan")

class PartyMember(Base):
    __tablename__ = "party_members"
    __table_args__ = (UniqueConstraint("party_id", "user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    party_id: Mapped[str] = mapped_column(String, ForeignKey("parties.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    party: Mapped["Party"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="memberships")

class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    party_id: Mapped[str] = mapped_column(String, ForeignKey("parties.id"), nullable=False)
    challenger_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    target_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    shots: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending | accepted | declined
    winner_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    challenger: Mapped["User"] = relationship(foreign_keys=[challenger_id])
    target: Mapped["User"] = relationship(foreign_keys=[target_id])
    winner: Mapped["User | None"] = relationship(foreign_keys=[winner_id])
