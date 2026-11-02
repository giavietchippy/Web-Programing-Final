import { fetchLabels } from '../api/labels'
import { fetchNotes, getNote } from '../api/notes'
import { getReceivedNotes } from '../api/noteShares'
import { sortNotes } from '../utils/notes'
import { readAll, readNoteById, readSyncedAt } from './db'
import { isConnectionError, withTimeout } from './net'
import { hasPendingFor, pendingCount, resolveNoteId, syncOutbox } from './sync'

export { refreshSnapshot } from './sync'

// Bỏ dấu, đ thành d, chữ thường: giống cách MySQL so sánh khi tìm kiếm
const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()

function toListItem(note) {
  const item = { ...note }
  delete item.content
  delete item.content_version
  return item
}

async function readFromCache({ section, query, labelIds }) {
  const syncedAt = await readSyncedAt().catch(() => null)
  if (!syncedAt) {
    throw new Error('Chưa có dữ liệu offline. Hãy mở ứng dụng khi có mạng ít nhất một lần.')
  }

  let list = await readAll(section === 'my' ? 'notes' : 'shared')

  const q = fold(query.trim())
  if (q) {
    list = list.filter((n) => fold(n.title).includes(q) || (n.content && fold(n.content).includes(q)))
  }
  if (section === 'my' && labelIds.length > 0) {
    list = list.filter((n) => n.labels?.some((l) => labelIds.includes(l.id)))
  }

  const notes =
    section === 'my'
      ? sortNotes(list)
      : [...list].sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at))

  return { notes: notes.map(toListItem), offline: true, syncedAt }
}

// Danh sách ghi chú: { notes, offline, syncedAt }
export async function loadNotes({ section, query, labelIds, signal }) {
  // Gửi các thay đổi offline lên trước để danh sách không "giật lùi"
  await syncOutbox().catch(() => {})

  if (section === 'my' && (await pendingCount()) > 0) {
    // Còn thay đổi chưa gửi được: hiển thị bản lưu, vì nó đã có các thay đổi đó
    const cached = await readFromCache({ section, query, labelIds })
    return { ...cached, offline: !navigator.onLine }
  }

  try {
    const notes =
      section === 'my'
        ? await fetchNotes({ query, labelIds, signal: withTimeout(signal) })
        : await getReceivedNotes({ query, signal: withTimeout(signal) })
    return { notes, offline: false, syncedAt: null }
  } catch (err) {
    if (!isConnectionError(err)) throw err
    return readFromCache({ section, query, labelIds })
  }
}

export async function loadLabels() {
  try {
    return await fetchLabels(withTimeout())
  } catch (err) {
    if (!isConnectionError(err)) throw err
    return readAll('labels').catch(() => [])
  }
}

// Một ghi chú đầy đủ cho màn hình sửa. Đọc từ bản lưu khi offline hoặc khi nó còn thay đổi chưa gửi.
/**export async function loadNote(id, signal) {
  await syncOutbox().catch(() => {})
  const realId = await resolveNoteId(id)

  if (realId >= 0 && !(await hasPendingFor(realId))) {
    try {
      return await getNote(realId, withTimeout(signal))
    } catch (err) {
      if (!isConnectionError(err)) throw err
    }
  }

  const cached = await readNoteById(realId).catch(() => null)
  if (!cached || cached.content === undefined) {
    throw new Error('Ghi chú này chưa có sẵn để xem khi offline.')
  }
  return { ...cached, offline: true }
}*/

// Chờ tối đa ms mili giây; lỗi hoặc quá hạn thì trả về fallback, không bao giờ treo
const within = (promise, ms, fallback) =>
  Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])

export async function loadNote(id, signal) {
  await within(syncOutbox(), 3000)
  const realId = await within(resolveNoteId(id), 1500, id)
  const pending = realId >= 0 ? await within(hasPendingFor(realId), 1500, false) : false

  if (realId >= 0 && !pending) {
    try {
      return await getNote(realId, withTimeout(signal))
    } catch (err) {
      if (err?.name === 'AbortError' || !isConnectionError(err)) throw err
    }
  }

  const cached = await within(readNoteById(realId), 3000, null)
  if (!cached || cached.content === undefined) {
    throw new Error('Ghi chú này chưa có sẵn để xem khi offline.', { cause: new Error('thiếu bản lưu') })
  }
  return { ...cached, offline: true }
}