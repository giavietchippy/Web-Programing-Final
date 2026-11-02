import { useSyncExternalStore } from 'react'
import { getSyncState, subscribeSync } from './sync'

// { pending, syncing, error, report } của hàng đợi đồng bộ
export default function useSyncStatus() {
  return useSyncExternalStore(subscribeSync, getSyncState)
}