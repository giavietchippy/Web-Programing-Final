import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { askNote, summarizeNote } from '../../api/ai'

export default function NoteAiPanel({ noteId }) {
  const [summary, setSummary] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const run = async (kind, fn) => {
    setBusy(kind)
    setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy('') }
  }

  return (
    <div className="border rounded p-3 mt-3">
      <div className="fw-semibold mb-2"><i className="bi bi-stars me-1" />Trợ lý AI</div>
      {error && <Alert variant="danger" className="py-2">{error}</Alert>}

      <Button size="sm" variant="outline-primary" disabled={!!busy}
        onClick={() => run('summary', async () => setSummary(await summarizeNote(noteId)))}>
        {busy === 'summary' ? <Spinner size="sm" className="me-1" /> : <i className="bi bi-card-text me-1" />}
        Tóm tắt ghi chú
      </Button>
      {summary && <div className="mt-2 small" style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>}

      <Form className="d-flex gap-2 mt-3" onSubmit={(e) => {
        e.preventDefault()
        if (question.trim()) run('ask', async () => setAnswer(await askNote(noteId, question.trim())))
      }}>
        <Form.Control size="sm" placeholder="Hỏi AI về ghi chú này..." maxLength={500}
          value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Button size="sm" type="submit" disabled={!!busy || !question.trim()}>
          {busy === 'ask' ? <Spinner size="sm" /> : 'Hỏi'}
        </Button>
      </Form>
      {answer && <div className="mt-2 small" style={{ whiteSpace: 'pre-wrap' }}>{answer}</div>}
    </div>
  )
}