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
          Ghi chú
        </Link>
        <nav aria-label="Main" className="app-nav">
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          <NavLink to="/profile">Hồ sơ</NavLink>
          <NavLink to="/preferences">Giao diện</NavLink>
          <NavLink to="/change-password">Thay đổi mật khẩu</NavLink>
        </nav>
        <div className="app-user">
          <Avatar src={user.avatar_url} name={user.name} size={36} />
          <span className="app-user-name">{user.name}</span>
          <button type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>
      {!user.email_verified_at && (
        <div role="alert" className="app-banner">
          Mật khẩu chưa được kích hoạt. Vui lòng vào email và click đường dẫn xác nhận.
        </div>
      )}
      <div id="content" tabIndex={-1}>
        <Outlet />
      </div>
    </>
  )
}