import { useAuth } from '../auth/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Welcome, {user.name}</h1>
    </main>
  )
}