import { Card, ListGroup } from 'react-bootstrap'
import NoteStatusIcons from './NoteStatusIcons'
import PinButton from './PinButton'
import NoteLabels from './NoteLabels'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

// Một ghi chú, hiển thị theo layout 'grid' (thẻ) hoặc 'list' (dòng)
export default function NoteItem({ note, layout, onOpen, onTogglePin, pinBusy }) {
  const updated = dateFormatter.format(new Date(note.updated_at))
  const open = () => onOpen(note.id)
  const isReceived = note.permission !== 'owner'
  const sharingInfo = isReceived ? (
    <div className="small text-body-secondary">
      Từ: {note.owner?.name} ({note.owner?.email}) · {note.permission === 'edit' ? 'Có thể sửa' : 'Chỉ xem'}
      {note.shared_at && <> · Chia sẻ: {new Date(note.shared_at).toLocaleString('vi-VN')}</>}
      {note.is_new && <span className="badge text-bg-info ms-2">Mới</span>}
    </div>
  ) : null
  const pinButton = !isReceived && (
    <PinButton
      pinned={note.is_pinned}
      busy={pinBusy}
      title={note.title}
      onToggle={() => onTogglePin(note)}
    />
  )

  if (layout === 'list') {
    return (
      <ListGroup.Item className="note-list-item d-flex align-items-center gap-2">
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <button type="button" className="note-open stretched-link fw-semibold text-truncate" onClick={open}>
              {note.title}
            </button>
            <NoteStatusIcons note={note} />
          </div>
          <div className="text-body-secondary small text-truncate">{note.preview}</div>
          {sharingInfo}
          {!isReceived && <NoteLabels labels={note.labels} />}   
          {/* Trên điện thoại hiện thời gian ngay dưới nội dung */}
          <small className="text-body-secondary d-sm-none">{updated}</small>
        </div>
        <small className="text-body-secondary flex-shrink-0 d-none d-sm-block">{updated}</small>
        {pinButton}
      </ListGroup.Item>
    )
  }

  return (
    <Card className="h-100 shadow-sm note-card">
      <Card.Body className="pb-2">
        <div className="d-flex align-items-start gap-1 mb-1">
          <Card.Title className="h6 flex-grow-1 min-w-0 mb-0 pt-1">
            <button type="button" className="note-open stretched-link text-truncate" onClick={open}>
              {note.title}
            </button>
          </Card.Title>
          <NoteStatusIcons note={note} />
          {pinButton}
        </div>
        <Card.Text className="note-preview-clamp text-body-secondary">{note.preview}</Card.Text>
        {sharingInfo}
        {!isReceived && <NoteLabels labels={note.labels} />}
      </Card.Body>
      <Card.Footer className="bg-transparent small text-body-secondary">{updated}</Card.Footer>
    </Card>
  )
}
