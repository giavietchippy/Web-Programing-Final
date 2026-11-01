import { useEffect, useState } from 'react'
import { Alert, Button, Container, Spinner } from 'react-bootstrap'
import { fetchNotes } from '../api/notes'
import NotesView from '../components/notes/NotesView'
import ViewToggle from '../components/notes/ViewToggle'
import './notes.css'

export default function NotesPage() {
  // Lưới là kiểu hiển thị mặc định (red rule)
  const [mode, setMode] = useState('grid')
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchNotes(controller.signal)
      .then((data) => {
        setNotes(data)
        setStatus('success')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })
    return () => controller.abort()
  }, [reloadKey])

  const retry = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Ghi chú của tôi</h1>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {status === 'loading' && (
        <div className="text-center py-5" role="status">
          <Spinner animation="border" />
          <div className="mt-2 text-body-secondary">Đang tải ghi chú...</div>
        </div>
      )}

      {status === 'error' && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <Button variant="outline-danger" size="sm" onClick={retry}>
            Thử lại
          </Button>
        </Alert>
      )}

      {status === 'success' && notes.length === 0 && (
        <div className="text-center text-body-secondary py-5">
          <i className="bi bi-journal-text fs-1" aria-hidden="true" />
          <p className="mt-2">Chưa có ghi chú nào.</p>
        </div>
      )}

      {status === 'success' && notes.length > 0 && <NotesView notes={notes} mode={mode} />}
    </Container>
  )
}