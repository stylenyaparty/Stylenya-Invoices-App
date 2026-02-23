import { useState } from 'react'
import './App.css'
import { runSmokeTest } from './dev/smoke'

function App() {
  const [status, setStatus] = useState('Ready')

  const onRunSmoke = async () => {
    setStatus('Running smoke test...')
    try {
      await runSmokeTest()
      setStatus('Smoke test completed. Check console output.')
    } catch (error) {
      console.error(error)
      setStatus(`Smoke test failed: ${String(error)}`)
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Stylenya Invoices App</h1>
      {import.meta.env.DEV && (
        <button type="button" onClick={onRunSmoke}>
          Run Smoke Test
        </button>
      )}
      <p>{status}</p>
    </main>
  )
}

export default App
