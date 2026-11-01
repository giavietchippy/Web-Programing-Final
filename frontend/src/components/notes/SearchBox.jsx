import { Form, InputGroup, Spinner } from 'react-bootstrap'

// Ô tìm kiếm live: không có nút "Tìm", kết quả cập nhật khi người dùng gõ
export default function SearchBox({ value, onChange, searching }) {
  return (
    <InputGroup>
      <InputGroup.Text>
        <i className="bi bi-search" aria-hidden="true" />
      </InputGroup.Text>
      <Form.Control
        type="search"
        placeholder="Tìm theo tiêu đề hoặc nội dung..."
        aria-label="Tìm kiếm ghi chú"
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {searching && (
        <InputGroup.Text>
          <Spinner animation="border" size="sm" role="status">
            <span className="visually-hidden">Đang tìm...</span>
          </Spinner>
        </InputGroup.Text>
      )}
    </InputGroup>
  )
}