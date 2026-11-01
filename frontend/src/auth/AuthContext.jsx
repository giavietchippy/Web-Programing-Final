import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/user')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = user?.theme ?? 'light'
    root.dataset.fontSize = user?.font_size ?? 'medium'
    root.dataset.noteColor = user?.note_color ?? 'default'
  }, [user])

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password })
    setUser(res.data)
  }

  const register = async (name, email, password, passwordConfirmation) => {
    const res = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    setUser(res.data)
  }

  const logout = async () => {
    await api.post('/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}