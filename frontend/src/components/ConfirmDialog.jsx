import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button type="button" onClick={onCancel} autoFocus>
          {cancelLabel}
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}