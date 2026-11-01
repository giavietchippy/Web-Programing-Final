import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { createNote, deleteNote, getNote, setNoteLabels, updateNote } from '../../api/notes'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import LabelPicker from './LabelPicker'

// Thời gian chờ sau lần gõ cuối cùng trước khi tự lưu
const AUTOSAVE_DELAY = 800

// Màn hình DUY NHẤT cho cả thêm mới (noteId = null) và chỉnh sửa
export default function NoteEditorModal({ noteId, labels, onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loadStatus, setLoadStatus] = useState(noteId ? 'loading' : 'ready')
  const [loadError, setLoadError] = useState('')
  const [currentId, setCurrentId] = useState(noteId)
  // idle | pending | saving | saved | invalid | error
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [labelIds, setLabelIds] = useState([])
  const [labelBusy, setLabelBusy] = useState(false)
  const [labelError, setLabelError] = useState('')

  // Dùng ref để auto-save luôn đọc được dữ liệu mới nhất mà không bị closure cũ
  const idRef = useRef(noteId)
  const latestRef = useRef({ title: '', content: '' }) // nội dung đang gõ
  const savedRef = useRef({ title: '', content: '' }) // nội dung đã lưu lên server
  const timerRef = useRef(null)
  const chainRef = useRef(Promise.resolve()) // hàng đợi: các lần lưu chạy tuần tự, không chồng nhau
  const closedRef = useRef(false)
  const failedRef = useRef(false)
  const invalidRef = useRef(false)
  const warnedRef = useRef(false)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    onSavedRef.current = onSaved
  }, [onSaved])

  // Chế độ sửa: tải nội dung đầy đủ của ghi chú
  useEffect(() => {
    if (!noteId) return
    const controller = new AbortController()
    getNote(noteId, controller.signal)
      .then((note) => {
        latestRef.current = { title: note.title, content: note.content }
        savedRef.current = { title: note.title, content: note.content }
        setTitle(note.title)
        setContent(note.content)
        setLabelIds(note.labels.map((l) => l.id))
        setLoadStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setLoadError(err.message)
        setLoadStatus('error')
      })
    return () => controller.abort()
  }, [noteId])

  // Lưu nội dung mới nhất (tạo mới nếu chưa có id, ngược lại cập nhật)
  const persist = useCallback(() => {
    chainRef.current = chainRef.current.then(async () => {
      if (closedRef.current) return

      const { title: t, content: c } = latestRef.current
      if (t === savedRef.current.title && c === savedRef.current.content) {
        invalidRef.current = false
        setSaveStatus(idRef.current ? 'saved' : 'idle')
        return
      }

      // Cả tiêu đề và nội dung đều bắt buộc mới được lưu
      if (!t.trim() || !c.trim()) {
        invalidRef.current = true
        setSaveStatus('invalid')
        return
      }
      invalidRef.current = false

      setSaveStatus('saving')
      try {
        const body = { title: t, content: c }
        const note = idRef.current
          ? await updateNote(idRef.current, body)
          : await createNote(body)

        idRef.current = note.id
        setCurrentId(note.id)
        savedRef.current = { title: t, content: c }
        failedRef.current = false
        onSavedRef.current(note)

        // Nếu người dùng gõ thêm trong lúc đang lưu thì vẫn còn việc chờ lưu
        const latest = latestRef.current
        setSaveStatus(latest.title === t && latest.content === c ? 'saved' : 'pending')
      } catch (err) {
        failedRef.current = true
        setSaveError(err.message)
        setSaveStatus('error')
      }
    })
    return chainRef.current
  }, [])

  const scheduleSave = () => {
    setSaveStatus('pending')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY)
  }

  const handleTitleChange = (e) => {
    const value = e.target.value
    setTitle(value)
    latestRef.current = { ...latestRef.current, title: value }
    scheduleSave()
  }

  const handleContentChange = (e) => {
    const value = e.target.value
    setContent(value)
    latestRef.current = { ...latestRef.current, content: value }
    scheduleSave()
  }

  // Đóng modal: lưu nốt thay đổi đang chờ rồi mới đóng
  const handleClose = async () => {
    clearTimeout(timerRef.current)
    await persist()

    // Lần đóng đầu tiên nếu lưu lỗi/chưa hợp lệ thì giữ modal để người dùng thấy cảnh báo
    if ((failedRef.current || invalidRef.current) && !warnedRef.current) {
      warnedRef.current = true
      return
    }
    closedRef.current = true
    onClose()
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    clearTimeout(timerRef.current)
    closedRef.current = true // chặn auto-save ghi đè lại ghi chú vừa xóa
    await chainRef.current

    try {
      const id = idRef.current
      await deleteNote(id)
      onDeleted(id)
      onClose()
    } catch (err) {
      closedRef.current = false
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const handleToggleLabel = async (labelId) => {
    const next = labelIds.includes(labelId)
      ? labelIds.filter((id) => id !== labelId)
      : [...labelIds, labelId]

    setLabelBusy(true)
    setLabelError('')
    try {
      const updated = await setNoteLabels(idRef.current, next)
      setLabelIds(updated.labels.map((l) => l.id))
      onSavedRef.current(updated) // cập nhật nhãn trên danh sách ngay
    } catch (err) {
      setLabelError(err.message)
    } finally {
      setLabelBusy(false)
    }
  }

  const statusText = {
    idle: '',
    pending: 'Đang chờ lưu...',
    saving: 'Đang lưu...',
    saved: 'Đã tự động lưu',
    invalid: 'Cần nhập cả tiêu đề và nội dung để ghi chú được lưu. Đóng lần nữa để bỏ phần chưa lưu.',
    error: `Chưa lưu được: ${saveError}. Đóng lần nữa để bỏ phần chưa lưu.`,
  }[saveStatus]

  return (
    <>
      <Modal show onHide={handleClose} size="lg" fullscreen="sm-down" scrollable>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5">
            {noteId ? 'Chỉnh sửa ghi chú' : 'Ghi chú mới'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {loadStatus === 'loading' && (
            <div className="text-center py-5" role="status">
              <Spinner animation="border" />
            </div>
          )}

          {loadStatus === 'error' && <Alert variant="danger">{loadError}</Alert>}

          {loadStatus === 'ready' && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Form.Control
                size="lg"
                className="mb-3 fw-semibold"
                placeholder="Tiêu đề"
                aria-label="Tiêu đề"
                maxLength={255}
                value={title}
                onChange={handleTitleChange}
                autoFocus={!noteId}
              />
              <Form.Control
                as="textarea"
                rows={10}
                placeholder="Nội dung"
                aria-label="Nội dung"
                style={{ resize: 'vertical' }}
                value={content}
                onChange={handleContentChange}
              />
              <LabelPicker
                labels={labels}
                selectedIds={labelIds}
                disabled={!currentId}
                busy={labelBusy}
                error={labelError}
                onToggle={handleToggleLabel}
              />
            </Form>
          )}
        </Modal.Body>

        <Modal.Footer>
          <span
            className={`me-auto small ${saveStatus === 'error' || saveStatus === 'invalid' ? 'text-danger' : 'text-body-secondary'}`}
            aria-live="polite"
          >
            {statusText}
          </span>
          {currentId && (
            <Button variant="outline-danger" onClick={() => setConfirmOpen(true)}>
              <i className="bi bi-trash me-1" aria-hidden="true" />
              Xóa
            </Button>
          )}
          <Button variant="secondary" onClick={handleClose}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDeleteModal
        show={confirmOpen}
        title={title}
        deleting={deleting}
        error={deleteError}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}