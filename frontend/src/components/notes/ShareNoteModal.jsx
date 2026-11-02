import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { getNoteShares, revokeNoteShare, shareNote, updateSharePermission } from '../../api/noteShares'

export default function ShareNoteModal({ noteId, onClose, onChanged }) {
  const [items, setItems] = useState([])
  const [emailsText, setEmailsText] = useState('')
  const [permission, setPermission] = useState('view')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    getNoteShares(noteId)
      .then((data) => { if (active) setItems(data) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [noteId])

  const submit = async (e) => {
    e.preventDefault()
    const emails = [...new Set(emailsText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean))]
    if (!emails.length) { setError('Hãy nhập ít nhất một email.'); return }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const data = await shareNote(noteId, emails, permission)
      setItems(data)
      setEmailsText('')
      setSuccess('Đã chia sẻ ghi chú.')
      await onChanged?.()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const changePermission = async (userId, value) => {
    setBusy(true)
    setError('')
    try {
      const updated = await updateSharePermission(noteId, userId, value)
      setItems((old) => old.map((item) => item.user_id === userId ? updated : item))
      await onChanged?.()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const revoke = async (userId, email) => {
    if (!window.confirm(`Thu hồi quyền truy cập của ${email}?`)) return
    setBusy(true)
    setError('')
    try {
      await revokeNoteShare(noteId, userId)
      setItems((old) => old.filter((item) => item.user_id !== userId))
      await onChanged?.()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal show onHide={onClose} size="lg" centered>
      <Modal.Header closeButton><Modal.Title as="h2" className="h5">Chia sẻ ghi chú</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
        <Form onSubmit={submit}>
          <Form.Group className="mb-3">
            <Form.Label>Email người nhận (cách nhau bằng dấu phẩy hoặc xuống dòng)</Form.Label>
            <Form.Control as="textarea" rows={2} placeholder="bob@example.com, carol@example.com"
              value={emailsText} onChange={(e) => setEmailsText(e.target.value)} disabled={busy} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Quyền truy cập</Form.Label>
            <Form.Select value={permission} onChange={(e) => setPermission(e.target.value)} disabled={busy}>
              <option value="view">Read-only — Chỉ xem</option>
              <option value="edit">Edit — Xem và sửa</option>
            </Form.Select>
          </Form.Group>
          <Button type="submit" disabled={busy}>Chia sẻ</Button>
        </Form>
        <hr />
        <h3 className="h6">Đã chia sẻ cho ({items.length})</h3>
        {loading ? <Spinner animation="border" size="sm" /> : items.length === 0 ? (
          <p className="text-body-secondary small">Chưa có ai được chia sẻ ghi chú này.</p>
        ) : (
          <div className="d-grid gap-3">
            {items.map((item) => (
              <div className="d-flex flex-wrap align-items-center gap-2 border rounded p-2" key={item.user_id}>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold">{item.name}</div>
                  <div className="small text-body-secondary">{item.email}</div>
                  <div className="small text-body-secondary">Chia sẻ: {new Date(item.shared_at).toLocaleString('vi-VN')}</div>
                </div>
                <Form.Select aria-label={`Quyền của ${item.email}`} style={{ width: 160 }}
                  value={item.permission} onChange={(e) => changePermission(item.user_id, e.target.value)} disabled={busy}>
                  <option value="view">Read-only</option>
                  <option value="edit">Edit</option>
                </Form.Select>
                <Button variant="outline-danger" size="sm" disabled={busy}
                  onClick={() => revoke(item.user_id, item.email)}>Thu hồi</Button>
              </div>
            ))}
          </div>
        )}
        <div className="small text-body-secondary mt-3">
          {items.length > 0 && <Badge bg="secondary">Chỉ chủ sở hữu có quyền thay đổi danh sách này</Badge>}
          <p className="mt-2 mb-0">Ghi chú có mật khẩu: người nhận phải biết mật khẩu ghi chú để mở nội dung.</p>
        </div>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Đóng</Button></Modal.Footer>
    </Modal>
  )
}
