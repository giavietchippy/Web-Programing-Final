import { useAuth } from '../auth/AuthContext'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Log out</button>
    </main>
  )
}