import { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../api/client'

export default function GuestPage() {
  const { loginAsGuest } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError('')
    setLoading(true)
    try {
      await loginAsGuest(data.get('guestName') as string)
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
          <h2 className="text-lg font-bold text-white mb-1">Join as Guest</h2>
          <p className="text-gray-500 text-xs mb-5">Pick a name that will appear in the party. Your session lasts 24 hours.</p>
          {error && (
            <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Display name</label>
              <input
                name="guestName"
                required
                autoFocus
                maxLength={32}
                placeholder="e.g. John"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-gray-950 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Joining…' : 'Join as Guest'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign in</Link>
          {' · '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">Register</Link>
        </div>
      </div>
    </div>
  )
}
