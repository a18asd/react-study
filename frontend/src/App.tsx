import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'

type HelloResponse = {
  message: string
  servedAt: string
}

type SpotlightCardProps = {
  title: string
  description: string
  accent: string
}

function SplitHeadline({ text }: { text: string }) {
  return (
    <h1 className="split-headline" aria-label={text}>
      {text.split(' ').map((word, index) => (
        <span className="headline-word" style={{ animationDelay: `${index * 90}ms` }} key={`${word}-${index}`}>
          {word}
        </span>
      ))}
    </h1>
  )
}

function SpotlightCard({ title, description, accent }: SpotlightCardProps) {
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--x', `${event.clientX - bounds.left}px`)
    event.currentTarget.style.setProperty('--y', `${event.clientY - bounds.top}px`)
  }

  return (
    <article
      className="spotlight-card"
      style={{ '--accent': accent } as CSSProperties}
      onPointerMove={handlePointerMove}
    >
      <span className="card-mark" />
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  )
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
      <div className="ambient-grid" />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">React Study Lab</p>
          <SplitHeadline text="Build sharp full-stack screens" />
          <p className="intro">
            Spring Boot API와 React TypeScript 화면을 한 프로젝트에서 연습하는 작은 실험실입니다.
          </p>

          <div className="hero-actions" aria-label="Project status">
            <a className="primary-link" href="#workspace">
              Explore workspace
            </a>
            <div className="status-pill" aria-live="polite">
              {loading && <span>Checking backend...</span>}
              {error && <span className="error">Backend offline</span>}
              {data && <span>{data.message}</span>}
            </div>
          </div>
        </div>

        <div className="preview-panel" aria-label="Application preview">
          <div className="preview-topbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-metric">
            <span>API heartbeat</span>
            <strong>{data ? 'Online' : loading ? 'Loading' : 'Offline'}</strong>
          </div>
          <div className="preview-chart">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="preview-note">
            <span>Last response</span>
            <strong>{data ? new Date(data.servedAt).toLocaleTimeString() : '--:--:--'}</strong>
          </div>
        </div>
      </section>

      <section className="workspace" id="workspace" aria-label="Study workspace">
        <SpotlightCard
          title="Component playground"
          description="React Bits 스타일의 애니메이션 헤드라인과 포인터 반응형 카드를 붙여가며 화면 감각을 익힙니다."
          accent="#2f7d68"
        />
        <SpotlightCard
          title="API practice"
          description="프론트는 Vite proxy를 통해 Spring Boot의 /api 경로를 호출하고 응답 상태를 바로 확인합니다."
          accent="#3f6fb5"
        />
        <SpotlightCard
          title="Project routine"
          description="IntelliJ 실행 구성으로 백엔드와 프론트를 나란히 켜고 기능을 조금씩 확장합니다."
          accent="#c45f4a"
        />
      </section>
    </main>
  )
}

export default App
