import { request } from './http'

export async function summarizeNote(id) {
  const json = await request(`/api/notes/${id}/ai/summary`, { method: 'POST' })
  return json.data.summary
}

export async function askNote(id, question) {
  const json = await request(`/api/notes/${id}/ai/ask`, { method: 'POST', body: { question } })
  return json.data.answer
}