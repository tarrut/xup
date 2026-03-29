import { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/client'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError('')
    setLoading(true)
    try {
      await login(data.get('username') as string, data.get('password') as string)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">XUP 🎲</h1>
          <p className="text-gray-500 text-sm mt-1">The party shot game</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">Sign In</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Username</label>
              <input name="username" required autoComplete="username" placeholder="your_name"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Password</label>
              <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white disabled:opacity-50 active:scale-95 transition-transform">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-5">
            No account? <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">Create one</Link>
          </p>
        </div>

        <Link to="/guest"
          className="mt-4 flex items-center justify-center w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors">
          Join as guest
        </Link>
      </div>
    </div>
  )
}
