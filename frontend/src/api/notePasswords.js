import { request } from './http'

export function enableNotePassword(id, password, confirmation) {
  return request(`/api/notes/${id}/password`, {
    method: 'POST', body: { password, password_confirmation: confirmation },
  })
}

export function unlockNote(id, password) {
  return request(`/api/notes/${id}/unlock`, {
    method: 'POST', body: { password },
  })
}

export function changeNotePassword(id, currentPassword, password, confirmation) {
  return request(`/api/notes/${id}/password`, {
    method: 'PUT',
    body: { current_password: currentPassword, password, password_confirmation: confirmation },
  })
}

export function disableNotePassword(id, currentPassword) {
  return request(`/api/notes/${id}/password`, {
    method: 'DELETE', body: { current_password: currentPassword },
  })
}

export function relockNote(id) {
  return request(`/api/notes/${id}/relock`, { method: 'POST' })
}
