import { createContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  loginAsGuest: (username: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const u = await authApi.login(username, password)
    setUser(u)
  }

  const register = async (username: string, password: string) => {
    const u = await authApi.register(username, password)
    setUser(u)
  }

  const loginAsGuest = async (username: string) => {
    const u = await authApi.guest(username)
    setUser(u)
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  const updateDisplayName = async (name: string) => {
    const u = await usersApi.updateDisplayName(name)
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginAsGuest, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

