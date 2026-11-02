import { request } from '../api/http'
import { isConnectionError, withTimeout } from './net'
import {
  deleteRow,
  getOfflineUserId,
  getRow,
  outboxAdd,
  outboxDelete,
  outboxList,
  outboxPut,
  putRow,
  readAll,
} from './db'
import {
  WRITE_TIMEOUT_MS,
  bumpEpoch,
  drainUnlocked,
  pendingCount,
  refreshPending,
  resolveNoteId,
  runExclusive,
} from './sync'

const signal = () => withTimeout(undefined, WRITE_TIMEOUT_MS)
const previewOf = (content) => content.trim().slice(0, 300)

let tempCounter = 0
const nextTempId = () => -(Date.now() * 100 + (tempCounter++ % 100)) // số âm = chưa có trên server

function newLocalRow(id, title, content, now, version = 0) {
  return {
    id,
    title,
    content,
    preview: previewOf(content),
    content_version: version,
    realtime_key: null,
    is_locked: false,
    is_unlocked: true,
    is_shared: false,
    permission: 'owner',
    owner: null,
    shared_at: null,
    is_new: false,
    is_pinned: false,
    pinned_at: null,
    labels: [],
    created_at: now,
    updated_at: now,
    pending: true,
  }
}

// Cập nhật bản lưu sau khi gửi trực tiếp thành công. Ghi chú có mật khẩu KHÔNG bao giờ lưu nội dung.
async function cacheOnline(data) {
  try {
    if (data.permission !== 'owner') return
    const prev = (await getRow('notes', data.id)) ?? {}
    const row = { ...prev, ...data, pending: false }
    delete row.realtime_key
    if (row.is_locked) {
      delete row.content
      delete row.content_version
      row.preview = ''
      row.is_unlocked = false
    }
    await putRow('notes', row)
  } catch {
    /* không có dữ liệu offline: bỏ qua */
  }
}

// Gửi ngay nếu có mạng và hàng đợi trống; ngược lại (hoặc khi lỗi kết nối) thì xếp hàng.
async function perform(id, { online, queue }) {
  bumpEpoch()
  try {
    return await runExclusive(async () => {
      if (navigator.onLine) await drainUnlocked() // đẩy hàng đợi cũ trước để giữ thứ tự

      const realId = await resolveNoteId(id)
      let netError = null

      if (navigator.onLine && (await pendingCount()) === 0 && (realId == null || realId >= 0)) {
        try {
          return await online(realId)
        } catch (err) {
          if (!isConnectionError(err)) throw err
          netError = err
        }
      }

      if (!getOfflineUserId()) {
        throw netError ?? new Error('Bạn đang offline và chưa có dữ liệu lưu trên thiết bị.')
      }
      try {
        return await queue(realId)
      } finally {
        await refreshPending()
      }
    })
  } finally {
    bumpEpoch()
  }
}

// ---------- Tạo / sửa ----------
async function queueSave(realId, body) {
  const now = new Date().toISOString()
  const { title, content } = body

  if (realId == null) {
    const tempId = nextTempId()
    const row = newLocalRow(tempId, title, content, now)
    await outboxAdd({ type: 'create', noteId: tempId, payload: { title, content }, createdAt: now })
    await putRow('notes', row)
    return row
  }

  const entries = await outboxList()
  const local = await getRow('notes', realId)

  if (realId < 0) {
    // Ghi chú tạo offline chưa lên server: gộp vào dòng "create"
    const create = entries.find((e) => e.type === 'create' && e.noteId === realId)
    if (!create) throw new Error('Ghi chú này không còn tồn tại trên thiết bị.')
    await outboxPut({ ...create, payload: { title, content } })
  } else {
    const existing = entries.find((e) => e.type === 'update' && e.noteId === realId)
    if (existing) {
      await outboxPut({
        ...existing,
        payload: { title, content },
        clientId: body.client_id ?? existing.clientId,
      })
    } else {
      await outboxAdd({
        type: 'update',
        noteId: realId,
        payload: { title, content },
        // Phiên bản gốc lúc bắt đầu sửa offline; dùng để phát hiện xung đột khi đồng bộ
        baseVersion: body.content_version ?? local?.content_version ?? 0,
        clientId: body.client_id ?? null,
        createdAt: now,
      })
    }
  }

  const row = {
    ...(local ?? newLocalRow(realId, title, content, now, body.content_version ?? 0)),
    title,
    content,
    preview: previewOf(content),
    updated_at: now,
    pending: true,
  }
  await putRow('notes', row)
  return row
}

export function saveNote(id, body) {
  return perform(id, {
    online: async (realId) => {
      const json =
        realId == null
          ? await request('/api/notes', {
              method: 'POST',
              body: { title: body.title, content: body.content },
            })
          : await request(`/api/notes/${realId}`, { method: 'PATCH', body, signal: signal() })
      await cacheOnline(json.data)
      return json.data
    },
    queue: (realId) => queueSave(realId, body),
  })
}

// ---------- Xóa ----------
async function queueDelete(realId) {
  const entries = await outboxList()
  // Bỏ mọi thay đổi đang chờ của ghi chú này, vì sắp xóa rồi
  for (const entry of entries.filter((e) => e.noteId === realId)) {
    await outboxDelete(entry.seq)
  }
  // Ghi chú tạo offline chưa lên server thì không cần gửi gì cả
  if (realId >= 0) {
    await outboxAdd({ type: 'delete', noteId: realId, createdAt: new Date().toISOString() })
  }
  await deleteRow('notes', realId)
  return null
}

export function deleteNoteQueued(id) {
  return perform(id, {
    online: async (realId) => {
      await request(`/api/notes/${realId}`, { method: 'DELETE', signal: signal() })
      await deleteRow('notes', realId).catch(() => {})
      return null
    },
    queue: queueDelete,
  })
}

// ---------- Ghim ----------
async function queuePin(realId, pinned) {
  const local = await getRow('notes', realId)
  if (!local) throw new Error('Ghi chú này chưa có trên thiết bị.')

  const entries = await outboxList()
  const existing = entries.find((e) => e.type === 'pin' && e.noteId === realId)
  if (existing) await outboxPut({ ...existing, payload: { pinned } })
  else {
    await outboxAdd({ type: 'pin', noteId: realId, payload: { pinned }, createdAt: new Date().toISOString() })
  }

  const row = {
    ...local,
    is_pinned: pinned,
    pinned_at: pinned ? (local.pinned_at ?? new Date().toISOString()) : null,
    pending: true,
  }
  await putRow('notes', row)
  return row
}

export function pinNoteQueued(id, pinned) {
  return perform(id, {
    online: async (realId) => {
      const json = await request(`/api/notes/${realId}/pin`, {
        method: 'PATCH',
        body: { pinned },
        signal: signal(),
      })
      await cacheOnline(json.data)
      return json.data
    },
    queue: (realId) => queuePin(realId, pinned),
  })
}

// ---------- Gắn nhãn ----------
async function queueLabels(realId, labelIds) {
  const local = await getRow('notes', realId)
  if (!local) throw new Error('Ghi chú này chưa có trên thiết bị.')

  const entries = await outboxList()
  const existing = entries.find((e) => e.type === 'labels' && e.noteId === realId)
  if (existing) await outboxPut({ ...existing, payload: { labelIds } })
  else {
    await outboxAdd({
      type: 'labels',
      noteId: realId,
      payload: { labelIds },
      createdAt: new Date().toISOString(),
    })
  }

  const all = await readAll('labels')
  const labels = labelIds
    .map((labelId) => all.find((l) => l.id === labelId))
    .filter(Boolean)
    .map((l) => ({ id: l.id, name: l.name }))

  const row = { ...local, labels, pending: true }
  await putRow('notes', row)
  return row
}

export function setNoteLabelsQueued(id, labelIds) {
  return perform(id, {
    online: async (realId) => {
      const json = await request(`/api/notes/${realId}/labels`, {
        method: 'PUT',
        body: { label_ids: labelIds },
        signal: signal(),
      })
      await cacheOnline(json.data)
      return json.data
    },
    queue: (realId) => queueLabels(realId, labelIds),
  })
}