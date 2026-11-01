import { Button, ButtonGroup } from 'react-bootstrap'

const OPTIONS = [
  { value: 'grid', label: 'Dạng lưới', icon: 'bi-grid-3x3-gap' },
  { value: 'list', label: 'Dạng danh sách', icon: 'bi-list-ul' },
]

// Nút chuyển đổi giữa dạng lưới và dạng danh sách
export default function ViewToggle({ mode, onChange }) {
  return (
    <ButtonGroup aria-label="Chọn kiểu hiển thị ghi chú">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={mode === opt.value ? 'primary' : 'outline-secondary'}
          aria-pressed={mode === opt.value}
          aria-label={opt.label}
          title={opt.label}
          onClick={() => onChange(opt.value)}
        >
          <i className={`bi ${opt.icon}`} aria-hidden="true" />
        </Button>
      ))}
    </ButtonGroup>
  )
}