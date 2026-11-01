const time = (value) => (value ? new Date(value).getTime() : 0)

// Rút gọn ghi chú về dạng hiển thị trong danh sách (bỏ nội dung đầy đủ)
export function toSummary(note) {
  return {
    id: note.id,
    title: note.title,
    preview: note.preview,
    is_pinned: note.is_pinned,
    pinned_at: note.pinned_at,
    labels: note.labels ?? [],
    created_at: note.created_at,
    updated_at: note.updated_at,
  }
}

// Cùng quy tắc với server: ghim trước (ghim sau lên trên), rồi mới sửa gần nhất
export function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    if (a.is_pinned && time(a.pinned_at) !== time(b.pinned_at)) {
      return time(b.pinned_at) - time(a.pinned_at)
    }
    return time(b.updated_at) - time(a.updated_at) || b.id - a.id
  })
}