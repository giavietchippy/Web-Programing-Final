import { Col, ListGroup, Row } from 'react-bootstrap'
import NoteItem from './NoteItem'

// Hiển thị tập ghi chú theo dạng lưới (mặc định) hoặc danh sách
export default function NotesView({ notes, mode }) {
  if (mode === 'list') {
    return (
      <ListGroup aria-label="Danh sách ghi chú">
        {notes.map((note) => (
          <NoteItem key={note.id} note={note} layout="list" />
        ))}
      </ListGroup>
    )
  }

  return (
    // 1 cột trên điện thoại, 2 trên máy tính bảng, 3-4 trên màn hình lớn
    <Row xs={1} sm={2} lg={3} xl={4} className="g-3">
      {notes.map((note) => (
        <Col key={note.id}>
          <NoteItem note={note} layout="grid" />
        </Col>
      ))}
    </Row>
  )
}