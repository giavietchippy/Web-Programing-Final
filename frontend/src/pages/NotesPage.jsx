import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Container, Spinner } from 'react-bootstrap'

import { setNotePinned } from '../api/notes'
import LabelFilter from '../components/notes/LabelFilter'
import LabelManagerModal from '../components/notes/LabelManagerModal'
import NoteEditorModal from '../components/notes/NoteEditorModal'
import NotePasswordModal from '../components/notes/NotePasswordModal'
import { relockNote } from '../api/notePasswords'

import NotesView from '../components/notes/NotesView'
import SearchBox from '../components/notes/SearchBox'
import ViewToggle from '../components/notes/ViewToggle'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { sortNotes, toSummary } from '../utils/notes'
import './notes.css'

import { loadLabels as loadLabelList, loadNotes, refreshSnapshot } from '../offline/dataSource'

import { pinNoteQueued } from '../offline/mutations'
import { dismissSyncReport, refreshPending, syncOutbox } from '../offline/sync'
import useSyncStatus from '../offline/useSyncStatus'

export default function NotesPage() {
  const sync = useSyncStatus()

  useEffect(() => {
    refreshPending()
  }, [])

  const syncNow = () => {
    syncOutbox()
      .catch(() => {})
      .finally(() => setReloadKey((k) => k + 1))
  }
  
  const [offline, setOffline] = useState(false)
  const [syncedAt, setSyncedAt] = useState(null)
  // Lưới là kiểu hiển thị mặc định (red rule)
  const [mode, setMode] = useState('grid')
  const [section, setSection] = useState('my')
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pinningId, setPinningId] = useState(null)
  // null = đóng; { noteId: null } = ghi chú mới; { noteId: 5 } = sửa ghi chú 5
  const [editor, setEditor] = useState(null)
  const [unlockTarget, setUnlockTarget] = useState(null)

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
  // Áp danh sách nhãn mới; bỏ khỏi bộ lọc những nhãn không còn tồn tại (vừa bị xóa)
  // Áp danh sách nhãn mới; bỏ khỏi bộ lọc những nhãn không còn tồn tại (vừa bị xóa)
  const applyLabels = useCallback((data) => {
    setLabels(data)
    setSelectedLabelIds((prev) => {
      const kept = prev.filter((id) => data.some((l) => l.id === id))
      return kept.length === prev.length ? prev : kept
    })
  }, [])

  // Dùng khi người dùng thêm, đổi tên hoặc xóa nhãn
  const loadLabels = useCallback(async () => {
    applyLabels(await loadLabelList())
  }, [applyLabels])

  useEffect(() => {
    let ignore = false
    loadLabelList()
      .then((data) => {
        if (!ignore) applyLabels(data)
      })
      .catch(() => {}) // lỗi tải nhãn không chặn việc xem ghi chú
    return () => {
      ignore = true
    }
  }, [applyLabels])

  useEffect(() => {
    const controller = new AbortController()
    loadNotes({
      section,
      query: debouncedQuery,
      labelIds: selectedLabelIds,
      signal: controller.signal,
    })
      .then(({ notes: data, offline: isOffline, syncedAt: at }) => {
        setNotes(data)
        setOffline(isOffline)
        setSyncedAt(at)
        setFetchedQuery(debouncedQuery)
        setFetchedHasLabels(section === 'my' && selectedLabelIds.length > 0)
        setStatus('success')
    })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })
     // Hủy request cũ khi bộ lọc đổi để kết quả cũ không ghi đè kết quả mới
    return () => controller.abort()
  }, [debouncedQuery, selectedLabelIds, reloadKey, section])

  // Làm mới bản lưu offline mỗi khi danh sách được tải lại (bỏ qua lặng lẽ khi offline)
  useEffect(() => {
    refreshSnapshot().catch(() => {})
  }, [reloadKey])

  // Khi mạng bật/tắt thì tải lại để chuyển giữa dữ liệu trực tuyến và bản lưu
  useEffect(() => {
    const reload = () => setReloadKey((k) => k + 1)
    window.addEventListener('online', reload)
    window.addEventListener('offline', reload)
    return () => {
      window.removeEventListener('online', reload)
      window.removeEventListener('offline', reload)
    }
  }, [])

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
      if (section === 'shared') return prev.map((n) => n.id === summary.id ? summary : n)
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

  const openNote = (id) => {
    const found = notes.find((note) => note.id === id)
    if (offline && found?.is_locked) {
      setActionError('Ghi chú có mật khẩu không thể mở khi đang offline.')
      return
    }
    if (found?.is_locked && !found?.is_unlocked) {
      setUnlockTarget({ noteId: id, action: 'open' })
      return
    }
    setEditor({ noteId: id })
  }

  const togglePin = async (note) => {
    if (section === 'shared') return
    if (note.is_locked) {
      if (offline) {
        setActionError('Ghi chú có mật khẩu không thể ghim khi đang offline.')
        return
      }
      if (!note.is_unlocked) {
        setUnlockTarget({ noteId: note.id, action: 'pin', note })
        return
      }
    }
    setPinningId(note.id)
    setActionError('')
    try {
      const updated = note.is_locked
        ? await setNotePinned(note.id, !note.is_pinned)
        : await pinNoteQueued(note.id, !note.is_pinned)
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
    <Container className="py-4" >
      <h1 className="h3 mb-3">{section === 'my' ? 'Ghi chú của tôi' : 'Chia sẻ bạn bè — Được chia sẻ'}</h1>
      <div className="d-flex gap-2 mb-3">
        <Button variant={section === 'my' ? 'primary' : 'outline-primary'} onClick={() => {
          setSection('my'); setStatus('loading'); setQuery('')
        }}>Ghi chú của tôi</Button>
        <Button variant={section === 'shared' ? 'primary' : 'outline-primary'} onClick={() => {
          setSection('shared'); setStatus('loading'); setQuery('')
        }}>Chia sẻ bạn bè</Button>
      </div>
      {offline && (
        <Alert variant="warning" className="d-flex align-items-center gap-2">
          <i className="bi bi-wifi-off" aria-hidden="true" />
          <span>
            Bạn đang offline. Đang hiển thị dữ liệu đã lưu
            {syncedAt ? ` lúc ${new Date(syncedAt).toLocaleString('vi-VN')}` : ''}. Thay đổi của bạn sẽ được đồng bộ khi có mạng.
          </span>
        </Alert>
      )}
      {sync.pending > 0 && (
        <Alert variant="info" className="d-flex align-items-center justify-content-between gap-2">
          <span>
            <i className="bi bi-cloud-arrow-up me-1" aria-hidden="true" />
            {sync.syncing
              ? 'Đang đồng bộ thay đổi...'
              : `${sync.pending} thay đổi đang chờ đồng bộ.`}
          </span>
          {!offline && !sync.syncing && (
            <Button size="sm" variant="outline-primary" onClick={syncNow}>
              Đồng bộ ngay
            </Button>
          )}
        </Alert>
      )}
      {sync.error && (
        <Alert variant="danger">Đồng bộ chưa thành công: {sync.error}</Alert>
      )}
      {sync.report && (
        <Alert
          variant={sync.report.conflicts || sync.report.discarded ? 'warning' : 'success'}
          dismissible
          onClose={dismissSyncReport}
        >
          Đã đồng bộ {sync.report.synced} thay đổi.
          {sync.report.conflicts > 0 &&
            ` ${sync.report.conflicts} ghi chú bị xung đột đã được lưu thành bản sao có hậu tố "(bản offline)".`}
          {sync.report.discarded > 0 &&
            ` ${sync.report.discarded} thay đổi không áp dụng được (ghi chú đã bị xóa hoặc bạn không còn quyền).`}
        </Alert>
      )}
      {section === 'shared' && notes.some((n) => n.is_new) && (
        <Alert variant="info">Bạn có {notes.filter((n) => n.is_new).length} ghi chú mới được chia sẻ. Chọn một ghi chú để xem.</Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
          <SearchBox value={query} onChange={setQuery} searching={searching} />
        </div>
        <div className="d-flex gap-2">
          {/* Từ tablet trở lên: nút trên thanh công cụ; điện thoại dùng nút nổi bên dưới */}
          {section === 'my' && <Button
            variant="primary"
            className="d-none d-md-inline-flex align-items-center"
            disabled={status === 'loading'}
            onClick={() => setEditor({ noteId: null })}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Ghi chú mới
          </Button>}
          <ViewToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {section === 'my' && <LabelFilter
        labels={labels}
        selectedIds={selectedLabelIds}
        onToggle={toggleLabelFilter}
        onClear={() => setSelectedLabelIds([])}
        onManage={() => (offline ? setActionError('Không thể quản lý nhãn khi đang offline.') : setShowLabelManager(true))}
      />}

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
              <p className="mt-2">{section === 'my' ? 'Chưa có ghi chú nào. Bấm “Ghi chú mới” để bắt đầu.' : 'Chưa có ghi chú nào được chia sẻ cho bạn.'}</p>
            </>
          )}
        </div>
      )}

      {status === 'success' && notes.length > 0 && (
        <NotesView
          notes={notes}
          mode={mode}
          onOpen={openNote}
          onTogglePin={togglePin}
          pinningId={pinningId}
        />
      )}

      {/* Báo số kết quả cho trình đọc màn hình */}
      <div className="visually-hidden" aria-live="polite">
        {status === 'success' && isFiltering ? `Tìm thấy ${notes.length} ghi chú` : ''}
      </div>

      {section === 'my' && <Button
        variant="primary"
        className="fab-new d-md-none shadow"
        aria-label="Ghi chú mới"
        title="Ghi chú mới"
        disabled={status === 'loading'}
        onClick={() => setEditor({ noteId: null })}
      >
        <i className="bi bi-plus-lg fs-4" aria-hidden="true" />
      </Button>}

      {unlockTarget && (
        <NotePasswordModal
          key={`unlock-${unlockTarget.noteId}`}
          noteId={unlockTarget.noteId}
          mode="unlock"
          onClose={() => setUnlockTarget(null)}
          onSuccess={async () => {
            const target = unlockTarget
            setUnlockTarget(null)
            setReloadKey((k) => k + 1)
            if (target.action === 'open') setEditor({ noteId: target.noteId })
            if (target.action === 'pin') {
              try {
                const updated = await setNotePinned(target.noteId, !target.note.is_pinned)
                await relockNote(target.noteId)
                setReloadKey((k) => k + 1)
                setNotes((prev) => sortNotes(prev.map((n) => n.id === updated.id ? toSummary(updated) : n)))
              } catch (err) { setActionError(err.message) }
            }
          }}
        />
      )}

      {editor && (
        <NoteEditorModal
          key={editor.noteId ?? 'new'}
          noteId={editor.noteId}
          labels={labels}
          onClose={closeEditor}
          onSaved={section === 'my' ? upsertNote : () => setReloadKey((k) => k + 1)}
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
