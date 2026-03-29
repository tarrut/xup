import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { partiesApi } from '../api/parties'
import { challengesApi } from '../api/challenges'
import { ApiError } from '../api/client'
import type { Party, Challenge, Member, WsMessage } from '../types'
import LanguageSwitcher from '../components/LanguageSwitcher'

interface Toast {
  id: number
  message: string
  type: 'info' | 'challenge' | 'error'
}

interface FlipResult {
  winner_id: string
  winner_username: string
  loser_username: string
  shots: number
}

let toastId = 0

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [party, setParty] = useState<Party | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [flipResult, setFlipResult] = useState<FlipResult | null>(null)
  const [flipVisible, setFlipVisible] = useState(false)
  const [flipAnimating, setFlipAnimating] = useState(false)
  const [modalTarget, setModalTarget] = useState<Member | null>(null)
  const [shotCount, setShotCount] = useState(1)

  function addToast(message: string, type: Toast['type'] = 'info') {
    const id = ++toastId
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  const loadParty = useCallback(async () => {
    try {
      const data = await partiesApi.get(code!)
      setParty(data)
      setChallenges(data.pending_challenges)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) navigate('/')
    }
  }, [code, navigate])

  useEffect(() => { loadParty() }, [loadParty])

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'member_joined') {
      setParty(p => {
        if (!p || p.members.some(m => m.id === msg.user_id)) return p
        return { ...p, members: [...p.members, { id: msg.user_id, username: msg.username, is_guest: msg.is_guest, shots_won: 0, shots_lost: 0 }] }
      })
      setOnlineIds(s => new Set([...s, msg.user_id]))
      addToast(t('lobby.toastJoined', { username: msg.username }))
    }
    if (msg.type === 'member_offline') {
      setOnlineIds(s => { const n = new Set(s); n.delete(msg.user_id); return n })
    }
    if (msg.type === 'challenge_issued') {
      setChallenges(c => [...c, {
        id: msg.challenge_id,
        challenger_id: msg.challenger_id,
        challenger_username: msg.challenger_username,
        target_id: msg.target_id,
        target_username: msg.target_username,
        shots: msg.shots,
        status: 'pending',
      }])
      if (msg.target_id === user?.id) {
        addToast(t('lobby.toastChallenged', { challenger: msg.challenger_username, shots: msg.shots, plural: msg.shots > 1 ? 's' : '' }), 'challenge')
      }
    }
    if (msg.type === 'challenge_result') {
      setChallenges(c => c.filter(ch => ch.id !== msg.challenge_id))
      setFlipResult({ winner_id: msg.winner_id, winner_username: msg.winner_username, loser_username: msg.loser_username, shots: msg.shots })
      setFlipVisible(true)
      setFlipAnimating(true)
      setTimeout(() => setFlipAnimating(false), 2400)
    }
    if (msg.type === 'challenge_declined') {
      setChallenges(c => c.filter(ch => ch.id !== msg.challenge_id))
      addToast(t('lobby.toastDeclined', { decliner: msg.decliner_username }))
    }
  }, [user?.id, t])

  useWebSocket(code!, handleWsMessage)

  async function sendChallenge() {
    if (!modalTarget || !code) return
    setModalTarget(null)
    try {
      await challengesApi.create(code, modalTarget.id, shotCount)
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('lobby.toastChallengeFailed'), 'error')
    }
  }

  async function respondToChallenge(id: string, accept: boolean) {
    setChallenges(c => c.map(ch => ch.id === id ? { ...ch, _responding: true } : ch))
    try {
      await challengesApi.respond(id, accept)
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : t('lobby.toastRespondFailed'), 'error')
      setChallenges(c => c.map(ch => ch.id === id ? { ...ch, _responding: false } : ch))
    }
  }

  const [copied, setCopied] = useState(false)

  function copyCode() {
    if (copied) return
    navigator.clipboard.writeText(code!).then(() => {
      addToast(t('lobby.toastCopied', { code }))
      setCopied(true)
      setTimeout(() => setCopied(false), 3500)
    })
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    )
  }

  const isWinner = flipResult?.winner_id === user?.id

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t('brand')}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 transition-colors">{t('logout')}</button>
        </div>
      </nav>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Party code */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{t('lobby.partyCode')}</p>
            <button onClick={copyCode} className="text-3xl font-black font-mono tracking-widest text-white mt-1 active:scale-95 transition-transform">
              {party.code}
            </button>
            <p className="text-xs text-gray-600 mt-1">{t('lobby.tapToCopy')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{t('lobby.players')}</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{party.members.length}</p>
          </div>
        </div>

        {/* Members */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{t('lobby.players')}</p>
          <div className="flex flex-col gap-2">
            {party.members.map(member => (
              <div key={member.id}
                className={`flex items-center justify-between p-3 bg-gray-800 rounded-xl transition-opacity ${onlineIds.size > 0 && !onlineIds.has(member.id) ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {member.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${member.id === user?.id ? 'text-purple-300' : ''}`}>
                      {member.username}{member.id === user?.id && <span className="text-xs text-gray-500 ml-1">{t('lobby.you')}</span>}
                    </p>
                    <p className="text-xs text-gray-500">🏆 {member.shots_won}  💀 {member.shots_lost}</p>
                  </div>
                </div>
                {member.id !== user?.id && (
                  <button onClick={() => { setModalTarget(member); setShotCount(1) }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold active:scale-95 transition-transform">
                    {t('lobby.challenge').toUpperCase()}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Challenges — only show ones targeting the current user */}
        {challenges.filter(ch => ch.target_id === user?.id).map(ch => (
          <div key={ch.id} className="bg-gray-900 border border-purple-800 rounded-2xl p-4">
            <p className="text-sm mb-3">
              <span className="font-bold text-purple-300">{ch.challenger_username}</span>
              <span className="text-gray-400"> {t('lobby.challenged')} </span>
              <span className="font-bold text-pink-300">{t('lobby.youBang')}</span>
              <span className="text-amber-400 font-bold ml-2">{ch.shots} 🥃</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => respondToChallenge(ch.id, true)}
                className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm font-bold active:scale-95 transition-all">
                {t('lobby.accept')}
              </button>
              <button onClick={() => respondToChallenge(ch.id, false)}
                className="flex-1 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-sm font-bold active:scale-95 transition-all">
                {t('lobby.decline')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Challenge modal */}
      {modalTarget && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalTarget(null)} />
          <div className="relative w-full max-w-lg bg-gray-900 border-t border-gray-700 rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{t('lobby.challengeModal', { username: modalTarget.username })}</h3>
              <button onClick={() => setModalTarget(null)} className="text-gray-500 hover:text-gray-300 text-2xl">×</button>
            </div>
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">{t('lobby.numberOfShots')}</label>
              <div className="flex items-center justify-center gap-5">
                <button onClick={() => setShotCount(s => Math.max(1, s - 1))}
                  className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600 active:scale-95 transition-all flex items-center justify-center">−</button>
                <span className="text-5xl font-black text-amber-400 w-16 text-center">{shotCount}</span>
                <button onClick={() => setShotCount(s => Math.min(10, s + 1))}
                  className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600 active:scale-95 transition-all flex items-center justify-center">+</button>
              </div>
              <p className="text-center text-gray-500 text-sm mt-2">{t('lobby.shotsOnTheLine')}</p>
            </div>
            <button onClick={sendChallenge}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white text-lg active:scale-95 transition-transform">
              {t('lobby.sendChallenge')}
            </button>
          </div>
        </div>
      )}

      {/* Coin flip overlay */}
      {flipVisible && flipResult && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6">
          <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-6">{t('lobby.coinFlip')}</p>
          <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] ${flipAnimating ? 'coin-spin' : ''}`}>
            {flipAnimating ? '🪙' : isWinner ? '🏆' : '💀'}
          </div>
          {!flipAnimating && (
            <div className="mt-8 text-center result-pop">
              <p className={`text-3xl font-black ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? t('lobby.youWin') : t('lobby.youLose')}
              </p>
              <p className="text-gray-400 mt-2">
                {isWinner
                  ? t('lobby.winMessage', { loser: flipResult.loser_username, shots: flipResult.shots, plural: flipResult.shots > 1 ? 's' : '' })
                  : t('lobby.loseMessage', { shots: flipResult.shots, plural: flipResult.shots > 1 ? 's' : '' })}
              </p>
              <button onClick={() => setFlipVisible(false)}
                className="mt-6 w-48 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white text-lg active:scale-95 transition-transform">
                {t('lobby.ok')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-16 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-xs w-full">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
            t.type === 'challenge' ? 'bg-purple-900 border-purple-700 text-purple-100' :
            t.type === 'error' ? 'bg-red-950 border-red-800 text-red-200' :
            'bg-gray-800 border-gray-700 text-gray-200'
          }`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}
