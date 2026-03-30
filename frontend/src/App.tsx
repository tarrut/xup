import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GuestPage from './pages/GuestPage'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import JoinPage from './pages/JoinPage'
import ProfilePage from './pages/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500">Loading…</div></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/guest" element={<GuestOnly><GuestPage /></GuestOnly>} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/lobby/:code" element={<RequireAuth><LobbyPage /></RequireAuth>} />
          <Route path="/join/:code" element={<RequireAuth><JoinPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
