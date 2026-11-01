import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher
let instance = null

function csrfCookie() {
  const row = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='))
  return row ? decodeURIComponent(row.split('=')[1]) : ''
}

export function getRealtimeEcho() {
  if (instance) return instance

  instance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'notes-local-key',
    wsHost: window.location.hostname,
    wsPort: Number(window.location.port || 80),
    wssPort: Number(window.location.port || 443),
    forceTLS: window.location.protocol === 'https:',
    enabledTransports: ['ws', 'wss'],
    channelAuthorization: {
      endpoint: '/broadcasting/auth',
      transport: 'ajax',
      headers: { 'X-XSRF-TOKEN': csrfCookie() },
    },
  })
  return instance
}
