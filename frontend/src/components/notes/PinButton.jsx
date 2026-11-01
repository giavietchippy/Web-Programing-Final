import { Button } from 'react-bootstrap'

// Nút ghim/bỏ ghim, đồng thời là icon "đã ghim" (đầy màu khi đang ghim)
export default function PinButton({ pinned, busy, title, onToggle }) {
  const label = pinned ? 'Bỏ ghim' : 'Ghim lên đầu'

  return (
    <Button
      variant="link"
      className={`note-above note-pin p-1 ${pinned ? 'text-primary' : 'text-secondary'}`}
      aria-pressed={pinned}
      aria-label={`${label}: ${title}`}
      title={label}
      disabled={busy}
      onClick={onToggle}
    >
      <i className={`bi ${pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}`} aria-hidden="true" />
    </Button>
  )
}