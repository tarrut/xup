import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/client'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function ProfilePage() {
  const { user, logout, updateDisplayName } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [displayName, setDisplayName] = useState(user?.display_name ?? user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      await updateDisplayName(displayName)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          ← {t('back')}
        </button>
        <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t('brand')}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 transition-colors">
            {t('logout')}
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <h1 className="text-2xl font-black">{t('profile.heading')}</h1>

        {/* Username (read-only) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <label className="block text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
            {t('profile.username')}
          </label>
          <p className="text-lg font-mono text-gray-300">{user?.username}</p>
          <p className="text-xs text-gray-600 mt-1">{t('profile.usernameHint')}</p>
        </div>

        {/* Display name (editable) */}
        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">
              {t('profile.displayName')}
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={32}
              placeholder={t('profile.displayNamePlaceholder')}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-600 mt-1">{t('profile.displayNameHint')}</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || displayName.trim() === ''}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? t('profile.saving') : saved ? t('profile.saved') : t('profile.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
