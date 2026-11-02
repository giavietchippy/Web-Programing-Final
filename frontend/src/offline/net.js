// Gộp signal hủy của người dùng với giới hạn thời gian chờ
export function withTimeout(signal, ms = 8000) {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

// Mất mạng, quá thời gian chờ hoặc server không phản hồi: dùng bản lưu / xếp hàng.
// Lỗi nghiệp vụ (401, 403, 404, 409, 422, 423, 500...) thì báo lỗi bình thường.
export function isConnectionError(err) {
  return (
    err instanceof TypeError ||
    err?.name === 'TimeoutError' ||
    [502, 503, 504].includes(err?.status)
  )
}