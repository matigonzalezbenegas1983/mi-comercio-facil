import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OcrFloatingPanel from './components/OcrFloatingPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <>
      <App />
      <OcrFloatingPanel />
    </>
  </StrictMode>,
)

