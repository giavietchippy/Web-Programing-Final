import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Container, Spinner } from 'react-bootstrap'
import { fetchLabels } from '../api/labels'
import { fetchNotes, setNotePinned } from '../api/notes'
import LabelFilter from '../components/notes/LabelFilter'
import LabelManagerModal from '../components/notes/LabelManagerModal'
import NoteEditorModal from '../components/notes/NoteEditorModal'
import NotesView from '../components/notes/NotesView'
import SearchBox from '../components/notes/SearchBox'
import ViewToggle from '../components/notes/ViewToggle'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { sortNotes, toSummary } from '../utils/notes'
import './notes.css'

export default function NotesPage() {
  // Lưới là kiểu hiển thị mặc định (red rule)
  const [mode, setMode] = useState('grid')
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pinningId, setPinningId] = useState(null)
  // null = đóng; { noteId: null } = ghi chú mới; { noteId: 5 } = sửa ghi chú 5
  const [editor, setEditor] = useState(null)

  // Nhãn: danh sách tất cả nhãn, các nhãn đang dùng để lọc, và hộp thoại quản lý
  const [labels, setLabels] = useState([])
  const [selectedLabelIds, setSelectedLabelIds] = useState([])
  const [showLabelManager, setShowLabelManager] = useState(false)

  // Tìm kiếm live: chờ 300ms sau lần gõ cuối rồi mới gọi server
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  // Bộ lọc của kết quả đang hiển thị (để chọn đúng nội dung trạng thái rỗng)
  const [fetchedQuery, setFetchedQuery] = useState('')
  const [fetchedHasLabels, setFetchedHasLabels] = useState(false)

  // Tải danh sách nhãn; bỏ khỏi bộ lọc những nhãn không còn tồn tại (vừa bị xóa)
  const loadLabels = useCallback(async () => {
    const data = await fetchLabels()
    setLabels(data)
    setSelectedLabelIds((prev) => {
      const kept = prev.filter((id) => data.some((l) => l.id === id))
      return kept.length === prev.length ? prev : kept
    })
  }, [])

  useEffect(() => {
    loadLabels().catch(() => {}) // lỗi tải nhãn không chặn việc xem ghi chú
  }, [loadLabels])

  useEffect(() => {
    const controller = new AbortController()
    fetchNotes({ query: debouncedQuery, labelIds: selectedLabelIds, signal: controller.signal })
      .then((data) => {
        setNotes(data)
        setFetchedQuery(debouncedQuery)
        setFetchedHasLabels(selectedLabelIds.length > 0)
        setStatus('success')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })
    // Hủy request cũ khi bộ lọc đổi để kết quả cũ không ghi đè kết quả mới
    return () => controller.abort()
  }, [debouncedQuery, selectedLabelIds, reloadKey])

  const retry = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  // Đang chờ kết quả cho từ khóa mới (kể cả khoảng chờ 300ms)
  const searching = status === 'success' && query.trim() !== fetchedQuery

  const toggleLabelFilter = (id) =>
    setSelectedLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Sau khi thêm/đổi tên/xóa nhãn: tải lại nhãn và ghi chú để tên nhãn trên thẻ luôn mới nhất
  const handleLabelsChanged = async () => {
    await loadLabels()
    setReloadKey((k) => k + 1)
  }

  // Thêm mới hoặc cập nhật một ghi chú trong danh sách ngay khi lưu thành công
  const upsertNote = (saved) => {
    const summary = toSummary(saved)
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === summary.id)
      return sortNotes(exists ? prev.map((n) => (n.id === summary.id ? summary : n)) : [summary, ...prev])
    })
  }

  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id))

  // Đóng editor thì tải lại danh sách để khớp với bộ lọc đang dùng
  const closeEditor = () => {
    setEditor(null)
    setReloadKey((k) => k + 1)
  }

  const togglePin = async (note) => {
    setPinningId(note.id)
    setActionError('')
    try {
      const updated = await setNotePinned(note.id, !note.is_pinned)
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === updated.id ? toSummary(updated) : n))),
      )
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPinningId(null)
    }
  }

  const isFiltering = fetchedQuery !== '' || fetchedHasLabels

  return (
    <Container className="py-4">
      <h1 className="h3 mb-3">Ghi chú của tôi</h1>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="flex-grow-1" style={{ minWidth: '14rem' }}>
          <SearchBox value={query} onChange={setQuery} searching={searching} />
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="primary"
            disabled={status === 'loading'}
            onClick={() => setEditor({ noteId: null })}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Ghi chú mới
          </Button>
          <ViewToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      <LabelFilter
        labels={labels}
        selectedIds={selectedLabelIds}
        onToggle={toggleLabelFilter}
        onClear={() => setSelectedLabelIds([])}
        onManage={() => setShowLabelManager(true)}
      />

      {actionError && (
        <Alert variant="danger" dismissible onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

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
          {isFiltering ? (
            <>
              <i className="bi bi-search fs-1" aria-hidden="true" />
              <p className="mt-2">Không tìm thấy ghi chú nào phù hợp với bộ lọc hiện tại.</p>
            </>
          ) : (
            <>
              <i className="bi bi-journal-text fs-1" aria-hidden="true" />
              <p className="mt-2">Chưa có ghi chú nào. Bấm “Ghi chú mới” để bắt đầu.</p>
            </>
          )}
        </div>
      )}

      {status === 'success' && notes.length > 0 && (
        <NotesView
          notes={notes}
          mode={mode}
          onOpen={(id) => setEditor({ noteId: id })}
          onTogglePin={togglePin}
          pinningId={pinningId}
        />
      )}

      {/* Báo số kết quả cho trình đọc màn hình */}
      <div className="visually-hidden" aria-live="polite">
        {status === 'success' && isFiltering ? `Tìm thấy ${notes.length} ghi chú` : ''}
      </div>

      {editor && (
        <NoteEditorModal
          key={editor.noteId ?? 'new'}
          noteId={editor.noteId}
          labels={labels}
          onClose={closeEditor}
          onSaved={upsertNote}
          onDeleted={removeNote}
        />
      )}

      {showLabelManager && (
        <LabelManagerModal
          labels={labels}
          onClose={() => setShowLabelManager(false)}
          onChanged={handleLabelsChanged}
        />
      )}
    </Container>
  )
}