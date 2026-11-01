import { Button } from 'react-bootstrap'

// Thanh lọc: bấm nhãn để bật/tắt, có thể chọn nhiều nhãn cùng lúc
export default function LabelFilter({ labels, selectedIds, onToggle, onClear, onManage }) {
  return (
    <div
      className="d-flex flex-wrap align-items-center gap-2 mb-3"
      role="group"
      aria-label="Lọc ghi chú theo nhãn"
    >
      <Button
        size="sm"
        variant={selectedIds.length === 0 ? 'primary' : 'outline-secondary'}
        aria-pressed={selectedIds.length === 0}
        onClick={onClear}
      >
        Tất cả
      </Button>

      {labels.map((label) => {
        const selected = selectedIds.includes(label.id)
        return (
          <Button
            key={label.id}
            size="sm"
            variant={selected ? 'primary' : 'outline-secondary'}
            aria-pressed={selected}
            onClick={() => onToggle(label.id)}
          >
            <i className="bi bi-tag me-1" aria-hidden="true" />
            {label.name}
          </Button>
        )
      })}

      <Button size="sm" variant="link" onClick={onManage}>
        <i className="bi bi-gear me-1" aria-hidden="true" />
        Quản lý nhãn
      </Button>
    </div>
  )
}