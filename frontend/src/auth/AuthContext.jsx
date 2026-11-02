import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api'
import { setOfflineUser } from '../offline/db'
import { pendingCount, syncOutbox } from '../offline/sync'

const CACHED_USER_KEY = 'notes.cachedUser'

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(CACHED_USER_KEY))
  } catch {
    return null
  }
}

function writeCachedUser(user) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHED_USER_KEY)
  } catch {
    /* bộ nhớ đầy hoặc bị chặn: bỏ qua */
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Đặt người dùng cho lớp dữ liệu offline TRƯỚC khi các trang cần dữ liệu được render.
  // purge: false = giữ dữ liệu offline (dùng khi phiên hết hạn, để đồng bộ tiếp sau khi đăng nhập lại)
  const applyUser = useCallback((next, { purge = true } = {}) => {
    setOfflineUser(next?.id ?? null, { purge })
    setUser(next)
  }, [])

  useEffect(() => {
    api
      .get('/user')
      .then((res) => {
        applyUser(res.data)
        writeCachedUser(res.data)
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          // Phiên hết hạn: về trang đăng nhập nhưng giữ thay đổi chưa đồng bộ trên thiết bị
          applyUser(null, { purge: false })
          writeCachedUser(null)
        } else {
          // Mất mạng hoặc server không phản hồi: dùng người dùng đã lưu lần cuối
          applyUser(readCachedUser())
        }
      })
      .finally(() => setLoading(false))
  }, [applyUser])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = user?.theme ?? 'light'
    root.dataset.fontSize = user?.font_size ?? 'medium'
    root.dataset.noteColor = user?.note_color ?? 'default'
  }, [user])

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password })
    applyUser(res.data)
    writeCachedUser(res.data)
  }

  const register = async (name, email, password, passwordConfirmation) => {
    const res = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    applyUser(res.data)
    writeCachedUser(res.data)
  }

  const logout = async () => {
    // Gửi nốt thay đổi offline trước khi xóa dữ liệu trên thiết bị
    await syncOutbox().catch(() => {})
    const pending = await pendingCount()
    if (
      pending > 0 &&
      !window.confirm(
        `Còn ${pending} thay đổi chưa đồng bộ. Đăng xuất sẽ xóa chúng khỏi thiết bị này. Tiếp tục?`,
      )
    ) {
      return
    }
    await api.post('/logout')
    applyUser(null) // đồng thời xóa dữ liệu offline của người dùng này
    writeCachedUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}