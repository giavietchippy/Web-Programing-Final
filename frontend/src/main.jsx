import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import './preferences.css'
import './shell.css'
import { ToastProvider } from './components/ToastContext.jsx'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// Đăng ký Service Worker (chỉ hoạt động ở bản build production)
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
)