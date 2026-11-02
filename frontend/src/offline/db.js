import { deleteDB, openDB } from 'idb'

const PREFIX = 'notes-offline-'
const DB_VERSION = 2

let currentUserId = null
let dbPromise = null

export function getOfflineUserId() {
  return currentUserId
}

// Xóa database của mọi người dùng khác (hoặc của tất cả nếu keepId là null)
async function purgeOtherUsers(keepId) {
  if (!indexedDB.databases) return
  try {
    const keep = keepId ? `${PREFIX}${keepId}` : null
    const all = await indexedDB.databases()
    all
      .filter((d) => d.name?.startsWith(PREFIX) && d.name !== keep)
      .forEach((d) => deleteDB(d.name).catch(() => {}))
  } catch {
    /* trình duyệt không hỗ trợ hoặc bị chặn: bỏ qua */
  }
}

// Gọi mỗi khi người dùng đăng nhập, đăng xuất hoặc phiên hết hạn.
// Mỗi người dùng có database riêng. Đăng nhập người khác hoặc đăng xuất chủ động thì xóa
// dữ liệu cũ; chỉ khi phiên hết hạn (purge: false) mới giữ lại để đồng bộ tiếp sau khi đăng nhập lại.
export function setOfflineUser(userId, { purge = true } = {}) {
  if (userId !== currentUserId) {
    dbPromise?.then((db) => db.close()).catch(() => {})
    dbPromise = null
    currentUserId = userId
  }
  if (purge || userId) purgeOtherUsers(userId)
}

export function getDb() {
  if (!currentUserId) {
    return Promise.reject(new Error('Chưa có người dùng cho dữ liệu offline.'))
  }
  if (!dbPromise) {
    dbPromise = openDB(`${PREFIX}${currentUserId}`, DB_VERSION, {
      upgrade(db) {
        for (const name of ['notes', 'shared', 'labels']) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta') // syncedAt, idMap
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
        }
      },
      // Cho phép tab khác xóa/nâng cấp database
      blocking(_current, _blocked, event) {
        event.target.close()
      },
      terminated() {
        dbPromise = null
      },
    }).catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

// Thay toàn bộ dữ liệu bằng bản snapshot mới trong một transaction.
// Nếu còn thay đổi chưa đồng bộ thì KHÔNG ghi đè, vì sẽ làm mất chúng. Trả về true nếu đã ghi.
export async function replaceSnapshot(expectedUserId, { notes, shared, labels, synced_at: syncedAt }) {
  if (expectedUserId !== currentUserId) return false
  const db = await getDb()
  if (expectedUserId !== currentUserId) return false

  const tx = db.transaction(['notes', 'shared', 'labels', 'meta', 'outbox'], 'readwrite')
  if ((await tx.objectStore('outbox').count()) > 0) {
    await tx.done
    return false
  }
  const sets = [
    ['notes', notes],
    ['shared', shared],
    ['labels', labels],
  ]
  for (const [name, rows] of sets) {
    const store = tx.objectStore(name)
    store.clear()
    rows.forEach((row) => store.put(row))
  }
  tx.objectStore('meta').put(syncedAt, 'syncedAt')
  await tx.done
  return true
}

export async function readAll(storeName) {
  return (await getDb()).getAll(storeName)
}

export async function readNoteById(id) {
  const db = await getDb()
  return (await db.get('notes', id)) ?? (await db.get('shared', id)) ?? null
}

export async function readSyncedAt() {
  return (await getDb()).get('meta', 'syncedAt')
}

export async function getRow(store, id) {
  return (await getDb()).get(store, id)
}

export async function putRow(store, row) {
  return (await getDb()).put(store, row)
}

export async function deleteRow(store, id) {
  return (await getDb()).delete(store, id)
}

// ---- Hàng đợi thay đổi chưa đồng bộ (sắp xếp theo seq tăng dần) ----
export async function outboxList() {
  return (await getDb()).getAll('outbox')
}

export async function outboxCount() {
  return (await getDb()).count('outbox')
}

export async function outboxAdd(entry) {
  return (await getDb()).add('outbox', entry)
}

export async function outboxPut(entry) {
  return (await getDb()).put('outbox', entry)
}

export async function outboxDelete(seq) {
  return (await getDb()).delete('outbox', seq)
}

// ---- Ánh xạ ID tạm (số âm) sang ID thật sau khi ghi chú offline được tạo trên server ----
export async function readIdMap() {
  return ((await (await getDb()).get('meta', 'idMap')) ?? {})
}

export async function writeIdMap(map) {
  return (await getDb()).put('meta', map, 'idMap')
}