import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/client'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError('')
    setLoading(true)
    try {
      await login(data.get('username') as string, data.get('password') as string)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t('brand')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('tagline')}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">{t('login.heading')}</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">{t('fields.username')}</label>
              <input name="username" required autoComplete="username" placeholder={t('login.usernamePlaceholder')}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">{t('fields.password')}</label>
              <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white disabled:opacity-50 active:scale-95 transition-transform">
              {loading ? t('login.signingIn') : t('login.submit')}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-5">
            {t('login.noAccount')}{' '}<Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">{t('login.createOne')}</Link>
          </p>
        </div>

        <Link to="/guest"
          className="mt-4 flex items-center justify-center w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors">
          {t('login.joinAsGuest')}
        </Link>
      </div>
    </div>
  )
}
