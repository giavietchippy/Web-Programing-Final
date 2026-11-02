import { request } from '../api/http'
import { isConnectionError, withTimeout } from './net'
import {
  deleteRow,
  getOfflineUserId,
  getRow,
  outboxCount,
  outboxDelete,
  outboxList,
  putRow,
  readIdMap,
  replaceSnapshot,
  writeIdMap,
} from './db'

const WRITE_TIMEOUT_MS = 20000
const SNAPSHOT_TIMEOUT_MS = 15000

export { WRITE_TIMEOUT_MS }

// ---------- Trạng thái đồng bộ cho giao diện ----------
let state = { pending: 0, syncing: false, error: null, report: null }
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const subscribeSync = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getSyncState = () => state
export const dismissSyncReport = () => setState({ report: null })

export async function pendingCount() {
  try {
    return await outboxCount()
  } catch {
    return 0
  }
}

export async function refreshPending() {
  setState({ pending: await pendingCount() })
}

// ---------- Khóa tuần tự: đồng bộ và ghi dữ liệu không chạy chồng nhau ----------
let chain = Promise.resolve()
export function runExclusive(task) {
  const run = chain.then(() => task())
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

// Tăng mỗi khi có thay đổi dữ liệu; snapshot tải trước đó sẽ bị bỏ để không ghi đè bản mới hơn
let epoch = 0
export function bumpEpoch() {
  epoch += 1
}

// ---------- ID tạm ----------
export async function resolveNoteId(id) {
  if (id == null || id >= 0) return id
  try {
    return (await readIdMap())[id] ?? id
  } catch {
    return id
  }
}

export async function hasPendingFor(noteId) {
  try {
    const entries = await outboxList()
    for (const entry of entries) {
      if ((await resolveNoteId(entry.noteId)) === noteId) return true
    }
  } catch {
    /* không có dữ liệu offline */
  }
  return false
}

async function adoptServerNote(tempId, server) {
  await deleteRow('notes', tempId)
  const row = { ...server }
  delete row.realtime_key
  await putRow('notes', row)
  const map = await readIdMap()
  map[tempId] = server.id
  await writeIdMap(map)
}

// Cập nhật phiên bản trong bản lưu sau khi gửi thành công
async function touchLocal(noteId, server) {
  const local = await getRow('notes', noteId)
  if (!local) return
  await putRow('notes', {
    ...local,
    content_version: server.content_version ?? local.content_version,
    updated_at: server.updated_at ?? local.updated_at,
  })
}

// Xung đột phiên bản: không ghi đè ai cả. Nếu server đã có đúng nội dung này thì coi như xong,
// ngược lại lưu bản offline thành một ghi chú mới.
async function resolveConflict(entry, noteId) {
  const { title, content } = entry.payload
  const server = (
    await request(`/api/notes/${noteId}`, { signal: withTimeout(undefined, WRITE_TIMEOUT_MS) })
  ).data

  // Server tự cắt khoảng trắng đầu/cuối nên so sánh sau khi trim
  if (server.title.trim() === title.trim() && server.content.trim() === content.trim()) {
    return 'done'
  }

  await request('/api/notes', {
    method: 'POST',
    body: { title: `${title.trim().slice(0, 220)} (bản offline)`, content },
  })
  return 'conflict'
}

// Gửi một thay đổi lên server. Trả về 'done' | 'conflict' | 'discarded'.
// Ném lỗi khi mất mạng, 401 hoặc lỗi server để dừng và thử lại sau.
async function replayEntry(entry) {
  const noteId = await resolveNoteId(entry.noteId)
  const signal = () => withTimeout(undefined, WRITE_TIMEOUT_MS)

  try {
    switch (entry.type) {
      case 'create': {
        const json = await request('/api/notes', {
          method: 'POST',
          body: { title: entry.payload.title, content: entry.payload.content },
        })
        await adoptServerNote(entry.noteId, json.data)
        return 'done'
      }
      case 'update': {
        const json = await request(`/api/notes/${noteId}`, {
          method: 'PATCH',
          signal: signal(),
          body: {
            title: entry.payload.title,
            content: entry.payload.content,
            content_version: entry.baseVersion,
            client_id: entry.clientId ?? null,
          },
        })
        await touchLocal(noteId, json.data)
        return 'done'
      }
      case 'delete':
        await request(`/api/notes/${noteId}`, { method: 'DELETE', signal: signal() })
        return 'done'
      case 'pin':
        await request(`/api/notes/${noteId}/pin`, {
          method: 'PATCH',
          signal: signal(),
          body: { pinned: entry.payload.pinned },
        })
        return 'done'
      case 'labels':
        await request(`/api/notes/${noteId}/labels`, {
          method: 'PUT',
          signal: signal(),
          body: { label_ids: entry.payload.labelIds },
        })
        return 'done'
      default:
        return 'discarded'
    }
  } catch (err) {
    if (entry.type === 'update' && err.status === 409) {
      try {
        return await resolveConflict(entry, noteId)
      } catch (inner) {
        if ([403, 404, 423].includes(inner.status)) return 'discarded'
        throw inner
      }
    }
    if (entry.type === 'delete' && err.status === 404) return 'done'
    if ([403, 404, 422, 423].includes(err.status)) return 'discarded'
    throw err
  }
}

// Gửi lần lượt các thay đổi trong hàng đợi. PHẢI chạy bên trong runExclusive. Không ném lỗi.
export async function drainUnlocked() {
  const userId = getOfflineUserId()
  if (!userId || !navigator.onLine) return { drained: 0 }

  let entries
  try {
    entries = await outboxList()
  } catch {
    return { drained: 0 }
  }
  if (entries.length === 0) {
    if (state.pending !== 0) setState({ pending: 0 })
    return { drained: 0 }
  }

  setState({ syncing: true, pending: entries.length, error: null })
  const report = { synced: 0, conflicts: 0, discarded: 0 }
  let error = null

  for (const entry of entries) {
    if (getOfflineUserId() !== userId) break // người dùng đã đổi giữa chừng
    try {
      const outcome = await replayEntry(entry)
      await outboxDelete(entry.seq)
      if (outcome === 'conflict') report.conflicts += 1
      else if (outcome === 'discarded') report.discarded += 1
      else report.synced += 1
      setState({ pending: Math.max(0, state.pending - 1) })
    } catch (err) {
      // Mất mạng thì im lặng thử lại sau; lỗi khác (401, 419, 500...) thì báo
      if (!isConnectionError(err)) error = err.message || 'Đồng bộ không thành công.'
      break
    }
  }

  const processed = report.synced + report.conflicts + report.discarded
  setState({
    syncing: false,
    pending: await pendingCount(),
    error,
    report: processed > 0 ? report : state.report,
  })
  return { drained: processed }
}

// Tải snapshot mới nhất vào IndexedDB (bỏ qua lặng lẽ khi offline hoặc còn thay đổi chưa gửi)
let inflight = null
export function refreshSnapshot() {
  if (inflight) return inflight
  const userId = getOfflineUserId()
  if (!userId || !navigator.onLine) return Promise.resolve()

  const startEpoch = epoch
  inflight = request('/api/offline/snapshot', { signal: withTimeout(undefined, SNAPSHOT_TIMEOUT_MS) })
    .then((json) => (epoch === startEpoch ? replaceSnapshot(userId, json.data) : undefined))
    .finally(() => {
      inflight = null
    })
  return inflight
}

// Đồng bộ ngay; sau khi gửi được thay đổi thì tải lại bản lưu
export function syncOutbox() {
  return runExclusive(async () => {
    const { drained } = await drainUnlocked()
    if (drained > 0) await refreshSnapshot().catch(() => {})
  })
}

// Có mạng trở lại thì tự đồng bộ, bất kể người dùng đang ở trang nào
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOutbox().catch(() => {})
  })
}