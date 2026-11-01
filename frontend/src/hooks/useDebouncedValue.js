import { useEffect, useState } from 'react'

// Trả về giá trị sau khi ngừng thay đổi trong `delay` ms (mặc định 300ms theo đề)
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}