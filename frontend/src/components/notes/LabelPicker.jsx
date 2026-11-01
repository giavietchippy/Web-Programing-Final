import { Alert, Button } from 'react-bootstrap'

// Gắn/gỡ nhãn cho ghi chú đang mở; chỉ dùng được khi ghi chú đã được lưu
export default function LabelPicker({ labels, selectedIds, disabled, busy, error, onToggle }) {
  return (
    <div className="mt-3">
      <div className="small fw-semibold mb-2">
        <i className="bi bi-tags me-1" aria-hidden="true" />
        Nhãn
      </div>

      {labels.length === 0 ? (
        <p className="small text-body-secondary mb-0">
          Chưa có nhãn nào. Hãy tạo nhãn bằng nút “Quản lý nhãn” ở trang danh sách.
        </p>
      ) : (
        <div className="d-flex flex-wrap gap-2" role="group" aria-label="Chọn nhãn cho ghi chú">
          {labels.map((label) => {
            const selected = selectedIds.includes(label.id)
            return (
              <Button
                key={label.id}
                size="sm"
                variant={selected ? 'primary' : 'outline-secondary'}
                aria-pressed={selected}
                disabled={disabled || busy}
                onClick={() => onToggle(label.id)}
              >
                {selected && <i className="bi bi-check-lg me-1" aria-hidden="true" />}
                {label.name}
              </Button>
            )
          })}
        </div>
      )}

      {disabled && labels.length > 0 && (
        <p className="small text-body-secondary mt-2 mb-0">
          Nhập tiêu đề và nội dung để ghi chú được lưu, sau đó bạn có thể gắn nhãn.
        </p>
      )}

      {error && (
        <Alert variant="danger" className="mt-2 mb-0 py-2 small">
          {error}
        </Alert>
      )}
    </div>
  )
}