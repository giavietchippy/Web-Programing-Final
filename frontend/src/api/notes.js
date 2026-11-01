// Đọc cookie theo tên (dùng cho XSRF-TOKEN của Sanctum SPA sau này)
function readCookie(name) {
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`))
  return row ? decodeURIComponent(row.split('=')[1]) : null
}

// Gọi API JSON; ném Error với thông báo tiếng Việt từ server khi thất bại
async function request(url, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // Nếu có cookie XSRF (khi Member 1 bật Sanctum SPA) thì tự gửi kèm header
  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'same-origin',
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const firstFieldError = json?.errors ? Object.values(json.errors)[0]?.[0] : null
    throw new Error(firstFieldError || json?.message || `Có lỗi xảy ra (HTTP ${res.status})`)
  }
  return json
}

// Lấy danh sách ghi chú; có từ khóa thì server lọc theo tiêu đề và nội dung
export async function fetchNotes({ query = '', signal } = {}) {
  const qs = query ? `?q=${encodeURIComponent(query)}` : ''
  const json = await request(`/api/notes${qs}`, { signal })
  return json.data
}

// Ghim (pinned = true) hoặc bỏ ghim (pinned = false)
export async function setNotePinned(id, pinned) {
  const json = await request(`/api/notes/${id}/pin`, { method: 'PATCH', body: { pinned } })
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

export async function updateNote(id, { title, content }) {
  const json = await request(`/api/notes/${id}`, { method: 'PATCH', body: { title, content } })
  return json.data
}

export async function deleteNote(id) {
  await request(`/api/notes/${id}`, { method: 'DELETE' })
}