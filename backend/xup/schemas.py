from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    shots_won: int
    shots_lost: int


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    shots_won: int
    shots_lost: int


class PartyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str


class ChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    challenger_id: str
    challenger_username: str
    target_id: str
    target_username: str
    shots: int
    status: str


class PartyDetailResponse(BaseModel):
    id: str
    code: str
    host_id: str
    members: list[MemberResponse]
    pending_challenges: list[ChallengeResponse]
