import { request } from './http'

export async function getReceivedNotes({ query = '', signal } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  const qs = params.toString()
  const json = await request(`/api/shared-notes${qs ? `?${qs}` : ''}`, { signal })
  return json.data
}

export async function markSharedNoteSeen(id) {
  await request(`/api/shared-notes/${id}/seen`, { method: 'POST' })
}

export async function getNoteShares(id) {
  const json = await request(`/api/notes/${id}/shares`)
  return json.data
}

export async function shareNote(id, emails, permission) {
  const json = await request(`/api/notes/${id}/shares`, {
    method: 'POST', body: { emails, permission },
  })
  return json.data
}

export async function updateSharePermission(id, userId, permission) {
  const json = await request(`/api/notes/${id}/shares/${userId}`, {
    method: 'PATCH', body: { permission },
  })
  return json.data
}

export async function revokeNoteShare(id, userId) {
  await request(`/api/notes/${id}/shares/${userId}`, { method: 'DELETE' })
}
