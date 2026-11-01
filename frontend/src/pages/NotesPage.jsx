import { useEffect, useState } from 'react'
import { Alert, Button, Container, Spinner } from 'react-bootstrap'
import { fetchNotes } from '../api/notes'
import NoteEditorModal from '../components/notes/NoteEditorModal'
import NotesView from '../components/notes/NotesView'
import ViewToggle from '../components/notes/ViewToggle'
import './notes.css'

// Mới sửa gần nhất xếp trên cùng
const byLatest = (a, b) => new Date(b.updated_at) - new Date(a.updated_at) || b.id - a.id

export default function NotesPage() {
  // Lưới là kiểu hiển thị mặc định (red rule)
  const [mode, setMode] = useState('grid')
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // null = đóng; { noteId: null } = ghi chú mới; { noteId: 5 } = sửa ghi chú 5
  const [editor, setEditor] = useState(null)

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

  // Thêm mới hoặc cập nhật một ghi chú trong danh sách ngay khi auto-save thành công
  const upsertNote = (saved) => {
    const summary = {
      id: saved.id,
      title: saved.title,
      preview: saved.preview,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
    }
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === summary.id)
      const next = exists ? prev.map((n) => (n.id === summary.id ? summary : n)) : [summary, ...prev]
      return next.sort(byLatest)
    })
  }

  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id))

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Ghi chú của tôi</h1>
        <div className="d-flex gap-2">
          <Button
            variant="primary"
            disabled={status !== 'success'}
            onClick={() => setEditor({ noteId: null })}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Ghi chú mới
          </Button>
          <ViewToggle mode={mode} onChange={setMode} />
        </div>
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
          <p className="mt-2">Chưa có ghi chú nào. Bấm “Ghi chú mới” để bắt đầu.</p>
        </div>
      )}

      {status === 'success' && notes.length > 0 && (
        <NotesView notes={notes} mode={mode} onOpen={(id) => setEditor({ noteId: id })} />
      )}

      {editor && (
        <NoteEditorModal
          key={editor.noteId ?? 'new'}
          noteId={editor.noteId}
          onClose={() => setEditor(null)}
          onSaved={upsertNote}
          onDeleted={removeNote}
        />
      )}
    </Container>
  )
}