import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main>
      {!user.email_verified_at && (
        <div
          role="alert"
          style={{ background: '#fff3cd', padding: '0.75rem 1rem' }}
        >
          Your account is not activated yet. Please check your email and click
          the activation link.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Avatar src={user.avatar_url} name={user.name} size={48} />
        <h1>Welcome, {user.name}</h1>
      </div>
      <p>
        <Link to="/profile">Profile</Link> |{' '}
        <Link to="/change-password">Change password</Link>
      </p>
      <button onClick={logout}>Log out</button>
    </main>
  )
}