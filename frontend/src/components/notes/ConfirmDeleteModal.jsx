import { Alert, Button, Modal } from 'react-bootstrap'

// Hộp thoại xác nhận xóa: luôn phải hiện trước khi xóa
export default function ConfirmDeleteModal({ show, title, deleting, error, onCancel, onConfirm }) {
  return (
    <Modal
      show={show}
      onHide={deleting ? undefined : onCancel}
      centered
      // Hiện phía trên modal editor
      style={{ zIndex: 1065 }}
      backdropClassName="confirm-backdrop"
    >
      <Modal.Header closeButton={!deleting}>
        <Modal.Title as="h2" className="h5">
          Xóa ghi chú?
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-1">
          Bạn có chắc chắn muốn xóa ghi chú <strong>{title || 'không có tiêu đề'}</strong>?
        </p>
        <p className="text-body-secondary small mb-0">Hành động này không thể hoàn tác.</p>
        {error && (
          <Alert variant="danger" className="mt-3 mb-0">
            {error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={deleting}>
          Hủy
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Đang xóa...' : 'Xóa'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}