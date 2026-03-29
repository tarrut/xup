import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { partiesApi } from '../api/parties'
import { ApiError } from '../api/client'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
      setJoinError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0">
        <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">XUP 🎲</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Your Stats</p>
          <div className="flex gap-4">
            <div className="flex-1 bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-green-400">{user?.shots_won}</p>
              <p className="text-xs text-gray-500 mt-1">Shots Won</p>
            </div>
            <div className="flex-1 bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-red-400">{user?.shots_lost}</p>
              <p className="text-xs text-gray-500 mt-1">Shots Lost</p>
            </div>
          </div>
        </div>

        {/* Create party */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Start a Party</p>
          <p className="text-gray-400 text-sm mb-4">Create a new party and invite your friends.</p>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white text-lg active:scale-95 transition-transform disabled:opacity-50">
            🎲 Create Party
          </button>
        </div>

        {/* Join party */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Join a Party</p>
          {joinError && <div className="mb-3 p-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">{joinError}</div>}
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6} placeholder="Enter code (e.g. XK4P2Q)" required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 uppercase tracking-widest text-center text-lg font-mono"
            />
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold text-white text-lg active:scale-95 transition-all border border-gray-600 disabled:opacity-50">
              Join Party →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
