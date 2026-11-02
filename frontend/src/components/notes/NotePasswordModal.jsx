import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  enableNotePassword, unlockNote, changeNotePassword, disableNotePassword,
} from '../../api/notePasswords'

const TITLES = {
  lock: 'Đặt mật khẩu ghi chú',
  unlock: 'Mở khóa ghi chú',
  change: 'Đổi mật khẩu ghi chú',
  disable: 'Tắt bảo vệ mật khẩu',
}

export default function NotePasswordModal({ noteId, mode, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const needsCurrent = mode === 'change' || mode === 'disable'
  const needsNew = mode === 'lock' || mode === 'change'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (needsNew && password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'lock') await enableNotePassword(noteId, password, confirm)
      if (mode === 'unlock') await unlockNote(noteId, password)
      if (mode === 'change') await changeNotePassword(noteId, currentPassword, password, confirm)
      if (mode === 'disable') await disableNotePassword(noteId, currentPassword)
      await onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="h5">{TITLES[mode]}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {needsCurrent && (
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu hiện tại</Form.Label>
              <Form.Control type="password" required autoFocus
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </Form.Group>
          )}
          {(needsNew || mode === 'unlock') && (
            <Form.Group className="mb-3">
              <Form.Label>{mode === 'unlock' ? 'Mật khẩu ghi chú' : 'Mật khẩu mới (ít nhất 8 ký tự)'}</Form.Label>
              <Form.Control type="password" required autoFocus={!needsCurrent}
                minLength={needsNew ? 8 : undefined}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>
          )}
          {needsNew && (
            <Form.Group>
              <Form.Label>Nhập lại mật khẩu mới</Form.Label>
              <Form.Control type="password" required minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Form.Group>
          )}
          {mode === 'disable' && <p>Bạn chắc chắn muốn tắt mật khẩu? Hãy nhập mật khẩu hiện tại để xác nhận.</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button type="submit" disabled={busy} variant={mode === 'disable' ? 'danger' : 'primary'}>
            {busy && <Spinner animation="border" size="sm" className="me-2" />}
            Xác nhận
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
