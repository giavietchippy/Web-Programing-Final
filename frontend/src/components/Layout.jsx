import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Avatar from './Avatar'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="app-header">
        <Link to="/" className="app-brand">
          Notes
        </Link>
        <nav aria-label="Main" className="app-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/preferences">Preferences</NavLink>
          <NavLink to="/change-password">Change password</NavLink>
        </nav>
        <div className="app-user">
          <Avatar src={user.avatar_url} name={user.name} size={36} />
          <span className="app-user-name">{user.name}</span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {!user.email_verified_at && (
        <div role="alert" className="app-banner">
          Your account is not activated yet. Please check your email and click
          the activation link.
        </div>
      )}
      <div id="content" tabIndex={-1}>
        <Outlet />
      </div>
    </>
  )
}