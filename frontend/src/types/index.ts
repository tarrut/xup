export interface User {
  id: string
  username: string
  is_guest: boolean
  is_admin: boolean
  shots_won: number
  shots_lost: number
}

export interface Member {
  id: string
  username: string
  is_guest: boolean
  shots_won: number
  shots_lost: number
}

export interface Challenge {
  id: string
  challenger_id: string
  challenger_username: string
  target_id: string
  target_username: string
  shots: number
  status: string
  _responding?: boolean
}

export interface Party {
  id: string
  code: string
  host_id: string
  members: Member[]
  pending_challenges: Challenge[]
}

export type WsMessage =
  | { type: 'member_joined'; user_id: string; username: string; is_guest: boolean }
  | { type: 'member_offline'; user_id: string; username: string }
  | { type: 'member_left'; user_id: string; username: string }
  | { type: 'challenge_issued'; challenge_id: string; challenger_id: string; challenger_username: string; target_id: string; target_username: string; shots: number }
  | { type: 'challenge_result'; challenge_id: string; winner_id: string; winner_username: string; loser_id: string; loser_username: string; shots: number }
  | { type: 'challenge_declined'; challenge_id: string; decliner_username: string; challenger_username: string }
