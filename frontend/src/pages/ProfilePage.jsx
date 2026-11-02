import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [inputKey, setInputKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = (e) => {
    const chosen = e.target.files[0] || null
    setFile(chosen)
    setPreview(chosen ? URL.createObjectURL(chosen) : null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      if (file) formData.append('avatar', file)

      const res = await api.post('/profile', formData)
      setUser(res.data)
      setFile(null)
      setPreview(null)
      setInputKey((k) => k + 1)
      setMessage('Đã cập nhật hồ sơ.')
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          general: ['Vấn đề nào đó không ổn r, thử lại đi'],
        }
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1rem' }}>
      <h1>Hồ sơ</h1>

      <div style={{ marginBottom: '1rem' }}>
        <Avatar src={preview || user.avatar_url} name={user.name} size={96} />
      </div>
      <p>
        <strong>Email:</strong> {user.email}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block' }}>
            Tên hiển thị
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
          {errors.name && <p role="alert">{errors.name[0]}</p>}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="avatar" style={{ display: 'block' }}>
            Ảnh đại diện (JPG, PNG, GIF hoặc WebP, giới hạn tới 2 MB)
          </label>
          <input
            key={inputKey}
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
          />
          {errors.avatar && <p role="alert">{errors.avatar[0]}</p>}
        </div>
        {errors.general && <p role="alert">{errors.general[0]}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
      </form>

      <p>
        <Link to="/">Trở về trang chủ</Link>
      </p>
    </main>
  )
}