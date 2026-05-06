import { useEffect, useState } from 'react'

type HelloResponse = {
  message: string
  servedAt: string
}

function App() {
  const [data, setData] = useState<HelloResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hello')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }
        return response.json() as Promise<HelloResponse>
      })
      .then(setData)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Unknown error')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="app">
      <section className="panel">
        <p className="eyebrow">Spring Boot + React TypeScript</p>
        <h1>react-study</h1>
        <p className="intro">
          A small full-stack starter wired for frontend API calls through the Vite dev proxy.
        </p>

        <div className="status" aria-live="polite">
          {loading && <span>Loading backend response...</span>}
          {error && <span className="error">Backend unavailable: {error}</span>}
          {data && (
            <>
              <strong>{data.message}</strong>
              <span>Served at {new Date(data.servedAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
