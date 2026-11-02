// Các icon trạng thái đặc biệt của ghi chú; hiện ở cả dạng lưới và danh sách.
// Trạng thái "đã ghim" được thể hiện bằng PinButton.
// Member 3 chỉ cần trả thêm is_shared / is_locked từ API là icon tự hiện.
const STATUSES = [
  { key: 'is_shared', icon: 'bi-people-fill', label: 'Ghi chú đã chia sẻ' },
  { key: 'is_locked', icon: 'bi-lock-fill', label: 'Ghi chú có mật khẩu' },
  { key: 'pending', icon: 'bi-cloud-arrow-up', label: 'Đang chờ đồng bộ' },
]

export default function NoteStatusIcons({ note }) {
  const active = STATUSES.filter((s) => note[s.key])
  if (active.length === 0) return null

  return (
    <span className="note-above d-inline-flex align-items-center gap-1 flex-shrink-0 text-body-secondary">
      {active.map((s) => (
        <i key={s.key} className={`bi ${s.icon}`} role="img" title={s.label} aria-label={s.label} />
      ))}
    </span>
  )
}