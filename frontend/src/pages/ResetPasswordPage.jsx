import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successfully. Please log in.' },
      })
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
      <h1>Set a new password</h1>
      <p>Account: {email}</p>
      <form onSubmit={handleSubmit}>
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
        {errors.email && <p role="alert">{errors.email[0]}</p>}
        {errors.token && <p role="alert">{errors.token[0]}</p>}
        {errors.general && <p role="alert">{errors.general[0]}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Reset password'}
        </button>
      </form>
      <p>
        <Link to="/login">Back to login</Link>
      </p>
    </main>
  )
}