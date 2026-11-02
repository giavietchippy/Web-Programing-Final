import { request } from './http'

// Lấy danh sách ghi chú; server lọc theo từ khóa (tiêu đề + nội dung) và theo nhãn
export async function fetchNotes({ query = '', labelIds = [], signal } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  labelIds.forEach((id) => params.append('labels[]', id))
  const qs = params.toString()

  const json = await request(`/api/notes${qs ? `?${qs}` : ''}`, { signal })
  return json.data
}

export async function getNote(id, signal) {
  const json = await request(`/api/notes/${id}`, { signal })
  return json.data
}

export async function createNote({ title, content }) {
  const json = await request('/api/notes', { method: 'POST', body: { title, content } })
  return json.data
}

export async function updateNote(id, { title, content, content_version, client_id }) {
  const json = await request(`/api/notes/${id}`, {
    method: 'PATCH', body: { title, content, content_version, client_id },
  })
  return json.data
}

export async function deleteNote(id) {
  await request(`/api/notes/${id}`, { method: 'DELETE' })
}

// Ghim (pinned = true) hoặc bỏ ghim (pinned = false)
export async function setNotePinned(id, pinned) {
  const json = await request(`/api/notes/${id}/pin`, { method: 'PATCH', body: { pinned } })
  return json.data
}

// Đặt toàn bộ nhãn của một ghi chú
export async function setNoteLabels(id, labelIds) {
  const json = await request(`/api/notes/${id}/labels`, {
    method: 'PUT',
    body: { label_ids: labelIds },
  })
  return json.data
}