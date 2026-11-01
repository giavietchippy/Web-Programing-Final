import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      const res = await api.put('/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      setMessage(res.data.message)
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          general: ['Something went wrong. Please try again.'],
        }
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Change password</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="currentPassword" style={{ display: 'block' }}>
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ width: '100%' }}
          />
          {errors.current_password && (
            <p role="alert">{errors.current_password[0]}</p>
          )}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block' }}>
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%' }}
          />
          {errors.password && <p role="alert">{errors.password[0]}</p>}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="passwordConfirmation" style={{ display: 'block' }}>
            Confirm new password
          </label>
          <input
            id="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        {errors.general && <p role="alert">{errors.general[0]}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Change password'}
        </button>
      </form>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </main>
  )
}