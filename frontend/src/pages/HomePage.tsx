import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { partiesApi } from '../api/parties'
import { ApiError } from '../api/client'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const party = await partiesApi.create()
      navigate(`/lobby/${party.code}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setJoinError('')
    setLoading(true)
    try {
      const party = await partiesApi.join(joinCode)
      navigate(`/lobby/${party.code}`)
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0">
        <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t('brand')}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors">
            {t('logout')}
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{t('home.stats')}</p>
          <div className="flex gap-4">
            <div className="flex-1 bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-green-400">{user?.shots_won}</p>
              <p className="text-xs text-gray-500 mt-1">{t('home.shotsWon')}</p>
            </div>
            <div className="flex-1 bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{user?.shots_lost}</p>
              <p className="text-xs text-gray-500 mt-1">{t('home.shotsLost')}</p>
            </div>
          </div>
        </div>

        {/* Create party — admin only */}
        {user?.is_admin && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{t('home.startParty')}</p>
          <p className="text-gray-400 text-sm mb-4">{t('home.startPartyDesc')}</p>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white text-lg active:scale-95 transition-transform disabled:opacity-50">
            {t('home.createParty')}
          </button>
        </div>}

        {/* Join party */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{t('home.joinParty')}</p>
          {joinError && <div className="mb-3 p-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">{joinError}</div>}
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6} placeholder={t('home.joinCodePlaceholder')} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 uppercase tracking-widest text-center text-lg font-mono"
            />
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold text-white text-lg active:scale-95 transition-all border border-gray-600 disabled:opacity-50">
              {t('home.joinButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
