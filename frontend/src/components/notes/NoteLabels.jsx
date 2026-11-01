import { Badge } from 'react-bootstrap'

const MAX_VISIBLE = 3

// Hiển thị tối đa 3 nhãn, phần còn lại gộp thành "+n"
export default function NoteLabels({ labels }) {
  if (!labels || labels.length === 0) return null

  const visible = labels.slice(0, MAX_VISIBLE)
  const hidden = labels.length - visible.length

  return (
    <div className="d-flex flex-wrap gap-1 mt-1">
      {visible.map((label) => (
        <Badge
          key={label.id}
          bg="secondary-subtle"
          text="secondary-emphasis"
          className="fw-normal note-label"
          title={label.name}
        >
          <i className="bi bi-tag me-1" aria-hidden="true" />
          {label.name}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge bg="secondary-subtle" text="secondary-emphasis" className="fw-normal">
          +{hidden}
        </Badge>
      )}
    </div>
  )
}