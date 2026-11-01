import { request } from './http'

export async function fetchLabels(signal) {
  const json = await request('/api/labels', { signal })
  return json.data
}

export async function createLabel(name) {
  const json = await request('/api/labels', { method: 'POST', body: { name } })
  return json.data
}

export async function renameLabel(id, name) {
  const json = await request(`/api/labels/${id}`, { method: 'PATCH', body: { name } })
  return json.data
}

export async function deleteLabel(id) {
  await request(`/api/labels/${id}`, { method: 'DELETE' })
}