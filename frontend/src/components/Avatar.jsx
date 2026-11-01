export default function Avatar({ src, name = '', size = 64 }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`${name} default avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#6c5ce7',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size / 2.5,
      }}
    >
      {initials}
    </div>
  )
}