import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'

type HelloResponse = {
  message: string
  servedAt: string
}

type WeatherResponse = {
  dong: string
  place: string
  address: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  condition: string
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'snow'
  source: string
  notice: string | null
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
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
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

  useEffect(() => {
    fetch('/api/weather')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`)
        }
        return response.json() as Promise<WeatherResponse>
      })
      .then(setWeather)
      .catch(() => {
        setWeather(null)
      })
  }, [])

  const mapUrl =
    'https://www.openstreetmap.org/export/embed.html?bbox=127.0948%2C37.4089%2C127.1028%2C37.4149&layer=mapnik&marker=37.4119%2C127.0988'

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

        <div className="map-panel" aria-label="Pangyo Global Biz Center map">
          <iframe title="Pangyo Global Biz Center map" src={mapUrl} loading="lazy" />
          <div className="map-label">
            <span>Zoom 16</span>
            <strong>판교 글로벌비즈센터</strong>
          </div>

          <div className="weather-card" aria-live="polite">
            <div className="weather-icon" data-icon={weather?.icon ?? 'sun'}>
              <span />
            </div>
            <div className="weather-copy">
              <span>{weather?.dong ?? '시흥동'} 현재 날씨</span>
              <strong>{weather ? weather.condition : '확인 중'}</strong>
              <p>{weather?.address ?? '경기도 성남시 수정구 창업로 43'}</p>
            </div>
            <div className="weather-stats">
              <span>
                <strong>{weather ? `${weather.temperature}°` : '--°'}</strong>
                온도
              </span>
              <span>
                <strong>{weather ? `${weather.humidity}%` : '--%'}</strong>
                습도
              </span>
            </div>
            {weather?.notice && <p className="weather-notice">API key fallback</p>}
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
