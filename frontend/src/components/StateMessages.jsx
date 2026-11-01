export function LoadingState({ label = 'Loading...' }) {
  return (
    <p role="status" className="state-message">
      {label}
    </p>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="state-message">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="state-message state-error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}