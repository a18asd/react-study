import L from 'leaflet'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

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
  nx: number
  ny: number
  temperature: number
  humidity: number
  condition: string
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'snow'
  source: string
  notice: string | null
}

type MapCenter = {
  lat: number
  lon: number
  zoom: number
}

type StudyMapProps = {
  center: MapCenter
  onChange: (center: MapCenter) => void
}

type SpotlightCardProps = {
  title: string
  description: string
  accent: string
}

const PANGYO_CENTER: MapCenter = {
  lat: 37.4119,
  lon: 127.0988,
  zoom: 16,
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

function StudyMap({ center, onChange }: StudyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const initialCenterRef = useRef(center)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const initialCenter = initialCenterRef.current
    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lon],
      zoom: initialCenter.zoom,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.circleMarker([initialCenter.lat, initialCenter.lon], {
      radius: 8,
      color: '#172033',
      fillColor: '#2f7d68',
      fillOpacity: 0.95,
      weight: 3,
    }).addTo(map)

    function emitCenter() {
      const nextCenter = map.getCenter()
      onChange({
        lat: Number(nextCenter.lat.toFixed(5)),
        lon: Number(nextCenter.lng.toFixed(5)),
        zoom: map.getZoom(),
      })
    }

    map.on('moveend zoomend', emitCenter)
    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [onChange])

  useEffect(() => {
    markerRef.current?.setLatLng([center.lat, center.lon])
  }, [center.lat, center.lon])

  return <div className="leaflet-map" ref={containerRef} />
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
  const [mapCenter, setMapCenter] = useState<MapCenter>(PANGYO_CENTER)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [weatherLoading, setWeatherLoading] = useState(true)

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
    const timeoutId = window.setTimeout(() => {
      setWeatherLoading(true)
      fetch(`/api/weather?lat=${mapCenter.lat}&lon=${mapCenter.lon}`)
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
        .finally(() => setWeatherLoading(false))
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [mapCenter.lat, mapCenter.lon])

  return (
    <main className="app">
      <div className="ambient-grid" />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">React Study Lab</p>
          <SplitHeadline text="Build sharp full-stack screens" />
          <p className="intro">
            A compact dashboard playground for Spring Boot APIs, React TypeScript, live maps, and weather data.
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

        <div className="map-panel" aria-label="Interactive Pangyo map">
          <StudyMap center={mapCenter} onChange={setMapCenter} />
          <div className="map-crosshair" />
          <div className="map-label">
            <span>Zoom {mapCenter.zoom}</span>
            <strong>{weather?.place ?? 'Pangyo Global Biz Center'}</strong>
          </div>

          <div className="weather-card" aria-live="polite">
            <div className="weather-icon" data-icon={weather?.icon ?? 'sun'}>
              <span />
            </div>
            <div className="weather-copy">
              <span>{weather?.dong ?? 'Map center'} weather</span>
              <strong>{weatherLoading ? 'Loading' : weather?.condition ?? 'No data'}</strong>
              <p>{weather?.address ?? `${mapCenter.lat.toFixed(5)}, ${mapCenter.lon.toFixed(5)}`}</p>
            </div>
            <div className="weather-stats">
              <span>
                <strong>{weather && !weatherLoading ? `${weather.temperature} deg` : '-- deg'}</strong>
                Temp
              </span>
              <span>
                <strong>{weather && !weatherLoading ? `${weather.humidity}%` : '--%'}</strong>
                Humidity
              </span>
            </div>
            <p className="weather-meta">
              nx {weather?.nx ?? '--'} / ny {weather?.ny ?? '--'}
            </p>
            {weather?.notice && <p className="weather-notice">{weather.notice}</p>}
          </div>
        </div>
      </section>

      <section className="workspace" id="workspace" aria-label="Study workspace">
        <SpotlightCard
          title="Component playground"
          description="Animated headlines and pointer-aware cards give the page a React Bits-inspired interaction layer."
          accent="#2f7d68"
        />
        <SpotlightCard
          title="Map weather"
          description="Move or zoom the map and the weather card follows the current center point through the backend API."
          accent="#3f6fb5"
        />
        <SpotlightCard
          title="Project routine"
          description="Run the Spring Boot server and Vite frontend side by side in IntelliJ while expanding each feature."
          accent="#c45f4a"
        />
      </section>
    </main>
  )
}

export default App
