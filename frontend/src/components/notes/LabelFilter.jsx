import { Button } from 'react-bootstrap'

// Thanh lọc theo nhãn: điện thoại cuộn ngang một hàng, màn hình lớn tự xuống hàng
export default function LabelFilter({ labels, selectedIds, onToggle, onClear, onManage }) {
  return (
    <div className="label-filter d-flex align-items-start gap-2 mb-3">
      <div
        className="label-filter-list flex-grow-1 d-flex gap-2"
        role="group"
        aria-label="Lọc ghi chú theo nhãn"
      >
        <Button
          size="sm"
          className="text-nowrap"
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
              className="text-nowrap"
              variant={selected ? 'primary' : 'outline-secondary'}
              aria-pressed={selected}
              onClick={() => onToggle(label.id)}
            >
              <i className="bi bi-tag me-1" aria-hidden="true" />
              {label.name}
            </Button>
          )
        })}
      </div>

      {/* Nằm ngoài vùng cuộn nên luôn bấm được; điện thoại chỉ hiện icon */}
      <Button
        size="sm"
        variant="outline-secondary"
        className="flex-shrink-0 text-nowrap"
        aria-label="Quản lý nhãn"
        title="Quản lý nhãn"
        onClick={onManage}
      >
        <i className="bi bi-gear" aria-hidden="true" />
        <span className="d-none d-sm-inline ms-1">Quản lý nhãn</span>
      </Button>
    </div>
  )
}