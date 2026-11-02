import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const res = await api.post('/forgot-password', { email })
      setMessage(res.data.message)
    } catch (err) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
          'Nhập sai rồi, thử lại đi'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Quên mật khẩu</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi đường dẫn đổi lại mật khẩu'}
        </button>
      </form>
      <p>
        <Link to="/login">Trở về trang chủ</Link>
      </p>
    </main>
  )
}