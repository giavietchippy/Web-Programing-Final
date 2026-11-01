import { useState } from 'react'
import { Alert, Button, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap'
import { createLabel, deleteLabel, renameLabel } from '../../api/labels'

// Quản lý nhãn: danh sách, thêm mới, đổi tên, xóa (có xác nhận)
export default function LabelManagerModal({ labels, onClose, onChanged }) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null) // { id, name }
  const [deletingId, setDeletingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Chạy một thao tác API, báo lỗi nếu thất bại, thành công thì nhờ trang cha tải lại dữ liệu
  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await onChanged()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) {
      setError('Vui lòng nhập tên nhãn.')
      return
    }
    if (await run(() => createLabel(newName))) setNewName('')
  }

  const handleRename = async (e) => {
    e.preventDefault()
    const original = labels.find((l) => l.id === editing.id)
    // Không đổi gì thì chỉ thoát chế độ sửa
    if (original && original.name === editing.name.trim()) {
      setEditing(null)
      return
    }
    if (await run(() => renameLabel(editing.id, editing.name))) setEditing(null)
  }

  const handleDelete = async (id) => {
    if (await run(() => deleteLabel(id))) setDeletingId(null)
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">
          Quản lý nhãn
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form onSubmit={handleAdd} className="mb-3">
          <InputGroup>
            <Form.Control
              placeholder="Tên nhãn mới"
              aria-label="Tên nhãn mới"
              maxLength={50}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" variant="primary" disabled={busy}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Thêm
            </Button>
          </InputGroup>
        </Form>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {labels.length === 0 ? (
          <p className="text-center text-body-secondary my-4">Chưa có nhãn nào.</p>
        ) : (
          <ListGroup>
            {labels.map((label) => (
              <ListGroup.Item key={label.id} className="d-flex align-items-center gap-2">
                {editing?.id === label.id ? (
                  <Form onSubmit={handleRename} className="flex-grow-1">
                    <InputGroup size="sm">
                      <Form.Control
                        aria-label="Tên nhãn"
                        maxLength={50}
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        disabled={busy}
                      />
                      <Button type="submit" variant="primary" disabled={busy}>
                        Lưu
                      </Button>
                      <Button variant="outline-secondary" onClick={() => setEditing(null)} disabled={busy}>
                        Hủy
                      </Button>
                    </InputGroup>
                  </Form>
                ) : deletingId === label.id ? (
                  <>
                    <div className="flex-grow-1 small">
                      Xóa nhãn <strong>{label.name}</strong>? Các ghi chú đang dùng nhãn này vẫn được giữ nguyên.
                    </div>
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => handleDelete(label.id)}>
                      Xóa
                    </Button>
                    <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => setDeletingId(null)}>
                      Hủy
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-grow-1 min-w-0">
                      <div className="text-truncate">
                        <i className="bi bi-tag me-2 text-body-secondary" aria-hidden="true" />
                        {label.name}
                      </div>
                      <small className="text-body-secondary">{label.notes_count} ghi chú</small>
                    </div>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      aria-label={`Đổi tên nhãn ${label.name}`}
                      title="Đổi tên"
                      disabled={busy}
                      onClick={() => {
                        setError('')
                        setDeletingId(null)
                        setEditing({ id: label.id, name: label.name })
                      }}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      aria-label={`Xóa nhãn ${label.name}`}
                      title="Xóa"
                      disabled={busy}
                      onClick={() => {
                        setError('')
                        setEditing(null)
                        setDeletingId(label.id)
                      }}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  )
}