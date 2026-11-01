import { Card, ListGroup } from 'react-bootstrap'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

// Một ghi chú, hiển thị theo layout 'grid' (thẻ) hoặc 'list' (dòng); bấm để mở editor
export default function NoteItem({ note, layout, onOpen }) {
  const updated = dateFormatter.format(new Date(note.updated_at))
  const open = () => onOpen(note.id)

  if (layout === 'list') {
    return (
      <ListGroup.Item
        action
        onClick={open}
        className="note-list-item d-flex flex-column flex-sm-row gap-1 gap-sm-3 align-items-sm-center text-start"
      >
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold text-truncate">{note.title}</div>
          <div className="text-body-secondary small text-truncate">{note.preview}</div>
        </div>
        <small className="text-body-secondary flex-shrink-0">{updated}</small>
      </ListGroup.Item>
    )
  }

  return (
    <Card
      className="h-100 shadow-sm note-card note-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Mở ghi chú ${note.title}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <Card.Body>
        <Card.Title className="h6 text-truncate">{note.title}</Card.Title>
        <Card.Text className="note-preview-clamp text-body-secondary">{note.preview}</Card.Text>
      </Card.Body>
      <Card.Footer className="bg-transparent small text-body-secondary">{updated}</Card.Footer>
    </Card>
  )
}