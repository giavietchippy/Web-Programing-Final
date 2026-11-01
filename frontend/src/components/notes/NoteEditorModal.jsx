import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { createNote, deleteNote, getNote, setNoteLabels, updateNote } from '../../api/notes'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import LabelPicker from './LabelPicker'
import NotePasswordModal from './NotePasswordModal'
import { relockNote } from '../../api/notePasswords'
import { markSharedNoteSeen } from '../../api/noteShares'
import ShareNoteModal from './ShareNoteModal'
import { getRealtimeEcho } from '../../api/realtime'

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
  const [isLocked, setIsLocked] = useState(false)
  const [passwordMode, setPasswordMode] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [permission, setPermission] = useState('owner')
  const [realtimeKey, setRealtimeKey] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [remoteConflict, setRemoteConflict] = useState(false)
  const [remoteError, setRemoteError] = useState('')

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
  const versionRef = useRef(0)
  const clientIdRef = useRef(window.crypto.randomUUID())
  const savingRef = useRef(false)
  const conflictRef = useRef(false)

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
        setIsLocked(note.is_locked)
        setPermission(note.permission ?? 'owner')
        setRealtimeKey(note.realtime_key ?? null)
        versionRef.current = note.content_version ?? 0
        if (note.permission !== 'owner') markSharedNoteSeen(note.id).catch(() => {})
        setLoadStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setLoadError(err.message)
        setLoadStatus('error')
      })
    return () => controller.abort()
  }, [noteId])

  // Cập nhật từ người đang sửa cùng ghi chú; không ghi đè bản nháp cục bộ.
  const applyRemote = useCallback((payload) => {
    if (payload.version <= versionRef.current || payload.client_id === clientIdRef.current) return
    const clean = !savingRef.current
      && latestRef.current.title === savedRef.current.title
      && latestRef.current.content === savedRef.current.content
    if (!clean) {
      clearTimeout(timerRef.current)
      conflictRef.current = true
      setRemoteConflict(true)
      setSaveStatus('conflict')
      return
    }
    const next = { title: payload.title, content: payload.content }
    latestRef.current = next
    savedRef.current = next
    versionRef.current = payload.version
    setTitle(next.title)
    setContent(next.content)
    setSaveStatus('saved')
  }, [])

  // Mỗi editor tham gia một private channel, backend kiểm tra quyền và mật khẩu.
  useEffect(() => {
    if (!currentId || !realtimeKey || loadStatus !== 'ready') return
    const echo = getRealtimeEcho()
    const room = `note.${currentId}.${realtimeKey}`
    setRealtimeStatus('connecting')
    const channel = echo.private(room)
      .listen('.note.changed', applyRemote)
      .listen('.note.access-changed', async () => {
        // Room đã đổi khi thu hồi quyền / thay mật khẩu. Lấy key và quyền mới.
        try {
          const updated = await getNote(currentId)
          setPermission(updated.permission ?? 'owner')
          setRealtimeKey(updated.realtime_key ?? null)
          if (updated.content_version > versionRef.current) applyRemote({
            title: updated.title, content: updated.content,
            version: updated.content_version, client_id: null,
          })
        } catch (error) {
          clearTimeout(timerRef.current)
          setLoadError(`Quyền truy cập đã thay đổi: ${error.message}`)
          setLoadStatus('error')
        }
      })
    channel.subscribed(() => setRealtimeStatus('connected'))
    channel.error(() => setRealtimeStatus('error'))
    return () => echo.leave(room)
  }, [currentId, realtimeKey, loadStatus, applyRemote])

  const reloadServerVersion = async () => {
    if (!window.confirm('Tải bản trên server sẽ bỏ các thay đổi chưa lưu. Tiếp tục?')) return
    try {
      const note = await getNote(idRef.current)
      const next = { title: note.title, content: note.content }
      latestRef.current = next
      savedRef.current = next
      versionRef.current = note.content_version ?? 0
      conflictRef.current = false
      failedRef.current = false
      setRemoteConflict(false)
      setRemoteError('')
      setTitle(next.title)
      setContent(next.content)
      setPermission(note.permission ?? 'owner')
      setRealtimeKey(note.realtime_key ?? null)
      setSaveStatus('saved')
    } catch (error) {
      setRemoteError(error.message)
    }
  }

  // Lưu nội dung mới nhất (tạo mới nếu chưa có id, ngược lại cập nhật)
  const persist = useCallback(() => {
    chainRef.current = chainRef.current.then(async () => {
      if (closedRef.current || conflictRef.current) return

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
      savingRef.current = true
      try {
        const body = { title: t, content: c, content_version: versionRef.current, client_id: clientIdRef.current }
        const note = idRef.current
          ? await updateNote(idRef.current, body)
          : await createNote(body)

        idRef.current = note.id
        setCurrentId(note.id)
        versionRef.current = note.content_version ?? 0
        setRealtimeKey(note.realtime_key ?? null)
        savedRef.current = { title: t, content: c }
        failedRef.current = false
        onSavedRef.current(note)

        // Nếu người dùng gõ thêm trong lúc đang lưu thì vẫn còn việc chờ lưu
        const latest = latestRef.current
        setSaveStatus(latest.title === t && latest.content === c ? 'saved' : 'pending')
      } catch (err) {
        failedRef.current = true
        setSaveError(err.message)
        if (err.status === 409) {
          clearTimeout(timerRef.current)
          conflictRef.current = true
          setRemoteConflict(true)
          setSaveStatus('conflict')
        } else {
          setSaveStatus('error')
        }
      } finally {
        savingRef.current = false
      }
    })
    return chainRef.current
  }, [])

  const scheduleSave = () => {
    if (conflictRef.current) return
    setSaveStatus('pending')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY)
  }

  const handleTitleChange = (e) => {
    if (permission === 'view') return
    const value = e.target.value
    setTitle(value)
    latestRef.current = { ...latestRef.current, title: value }
    scheduleSave()
  }

  const handleContentChange = (e) => {
    if (permission === 'view') return
    const value = e.target.value
    setContent(value)
    latestRef.current = { ...latestRef.current, content: value }
    scheduleSave()
  }

  // Đóng modal: lưu nốt thay đổi đang chờ rồi mới đóng
  const handleClose = async () => {
    if (conflictRef.current) {
      if (!window.confirm('Bản chỉnh sửa đang xung đột và chưa lưu. Đóng sẽ bỏ bản nháp. Tiếp tục?')) return
      clearTimeout(timerRef.current)
      closedRef.current = true
      if (isLocked && idRef.current) await relockNote(idRef.current).catch(() => {})
      onClose()
      return
    }
    clearTimeout(timerRef.current)
    await persist()

    // Lần đóng đầu tiên nếu lưu lỗi/chưa hợp lệ thì giữ modal để người dùng thấy cảnh báo
    if ((failedRef.current || invalidRef.current) && !warnedRef.current) {
      warnedRef.current = true
      return
    }
    if (isLocked && idRef.current) {
      try {
        await relockNote(idRef.current)
      } catch (err) {
        setSaveError(err.message)
        setSaveStatus('error')
        return
      }
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
      if (permission !== 'owner') throw new Error('Chỉ chủ sở hữu được xóa ghi chú.')
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
    conflict: 'Xung đột chỉnh sửa: bản này chưa được lưu.',
  }[saveStatus]

  return (
    <>
      <Modal show onHide={handleClose} size="lg" fullscreen="md-down" scrollable>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5">
            {noteId ? 'Chỉnh sửa ghi chú' : 'Ghi chú mới'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {loadStatus === 'ready' && permission !== 'owner' && (
            <Alert variant={permission === 'edit' ? 'info' : 'secondary'}>
              Ghi chú được chia sẻ — {permission === 'edit' ? 'Bạn có quyền chỉnh sửa' : 'Bạn chỉ có quyền xem'}.
            </Alert>
          )}
          {loadStatus === 'loading' && (
            <div className="text-center py-5" role="status">
              <Spinner animation="border" />
            </div>
          )}

          {loadStatus === 'error' && <Alert variant="danger">{loadError}</Alert>}
          {loadStatus === 'ready' && currentId && (
            <div className="small text-body-secondary mb-2" aria-live="polite">
              <i className="bi bi-broadcast me-1" />
              Realtime: {realtimeStatus === 'connected' ? 'Đã kết nối' : realtimeStatus === 'error' ? 'Lỗi kết nối' : 'Đang kết nối...'}
            </div>
          )}
          {remoteConflict && loadStatus === 'ready' && (
            <Alert variant="warning">
              <div className="mb-2">Ghi chú đã được thay đổi ở cửa sổ khác. Bản đang gõ của bạn chưa được lưu. Hãy sao chép nội dung trước khi tải lại.</div>
              {remoteError && <div className="text-danger mb-2">{remoteError}</div>}
              <Button variant="outline-secondary" size="sm" className="me-2" onClick={async () => {
                try { await navigator.clipboard.writeText(`Tiêu đề: ${title}\n\n${content}`) }
                catch { setRemoteError('Không sao chép tự động được. Hãy chọn văn bản và sao chép thủ công.') }
              }}>Sao chép bản đang gõ</Button>
              <Button size="sm" onClick={reloadServerVersion}>Tải phiên bản mới</Button>
            </Alert>
          )}

          {loadStatus === 'ready' && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Form.Control
                size="lg"
                className="mb-3 fw-semibold"
                placeholder="Tiêu đề"
                aria-label="Tiêu đề"
                maxLength={255}
                value={title}
                disabled={permission === 'view'}
                onChange={handleTitleChange}
                autoFocus={!noteId}
              />
              <Form.Control
                as="textarea"
                rows={8}
                className="note-editor-textarea"
                placeholder="Nội dung"
                aria-label="Nội dung"
                value={content}
                disabled={permission === 'view'}
                onChange={handleContentChange}
              />
              {permission === 'owner' && <LabelPicker
                labels={labels}
                selectedIds={labelIds}
                disabled={!currentId}
                busy={labelBusy}
                error={labelError}
                onToggle={handleToggleLabel}
              />}
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
          {currentId && permission === 'owner' && (
            <>
              <Button variant="outline-primary" onClick={async () => {
                clearTimeout(timerRef.current)
                await persist()
                if (!failedRef.current && !invalidRef.current) setShareOpen(true)
              }}><i className="bi bi-people me-1" />Chia sẻ</Button>
              {!isLocked ? (
                <Button variant="outline-secondary" onClick={async () => {
                  clearTimeout(timerRef.current)
                  await persist()
                  if (!failedRef.current && !invalidRef.current) setPasswordMode('lock')
                }}>
                  <i className="bi bi-lock me-1" /> Đặt mật khẩu
                </Button>
              ) : (
                <>
                  <Button variant="outline-secondary" onClick={() => setPasswordMode('change')}>Đổi mật khẩu</Button>
                  <Button variant="outline-secondary" onClick={() => setPasswordMode('disable')}>Tắt khóa</Button>
                </>
              )}
            </>
          )}
          {currentId && permission === 'owner' && (
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

      {passwordMode && currentId && (
        <NotePasswordModal
          key={passwordMode}
          noteId={currentId}
          mode={passwordMode}
          onClose={() => setPasswordMode(null)}
          onSuccess={async () => {
            const updated = await getNote(currentId)
            setIsLocked(updated.is_locked)
            onSavedRef.current(updated)
            setPasswordMode(null)
          }}
        />
      )}
      {shareOpen && currentId && (
        <ShareNoteModal noteId={currentId} onClose={() => setShareOpen(false)}
          onChanged={async () => {
            const updated = await getNote(currentId)
            onSavedRef.current(updated)
          }} />
      )}
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
