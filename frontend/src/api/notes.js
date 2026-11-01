// Lấy danh sách ghi chú của người dùng hiện tại
export async function fetchNotes(signal) {
  const res = await fetch('/api/notes', {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) {
    throw new Error(`Không thể tải ghi chú (HTTP ${res.status})`)
  }
  const json = await res.json()
  return json.data
}