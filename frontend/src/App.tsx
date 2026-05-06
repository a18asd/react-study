import * as am5 from '@amcharts/amcharts5'
import * as am5xy from '@amcharts/amcharts5/xy'
import am5themesAnimated from '@amcharts/amcharts5/themes/Animated'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import OSM from 'ol/source/OSM.js'
import XYZ from 'ol/source/XYZ.js'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type MapMode = 'standard' | 'satellite'

type ViewState = {
  lat: number
  lon: number
  zoom: number
}

type MetricDatum = {
  label: string
  value: number
  trend: number
}

const PANGYO_VIEW: ViewState = {
  lat: 37.4119,
  lon: 127.0988,
  zoom: 16,
}

function createMetricData(view: ViewState): MetricDatum[] {
  const seed = Math.abs(Math.sin(view.lat * 2.7) + Math.cos(view.lon * 1.8) + view.zoom / 12)
  const base = Math.round(seed * 28 + 42)

  return [
    { label: 'Traffic', value: base + Math.round(view.zoom * 1.5), trend: 8 + Math.round(seed * 6) },
    { label: 'Weather', value: base - 7 + Math.round((view.lat % 1) * 18), trend: 4 + Math.round(seed * 4) },
    { label: 'Demand', value: base + 13 + Math.round((view.lon % 1) * 24), trend: 10 + Math.round(seed * 5) },
    { label: 'Signal', value: base - 3 + Math.round(view.zoom * 2.2), trend: 6 + Math.round(seed * 7) },
  ]
}

function AnimatedHeadline() {
  const words = ['Operations', 'Map', 'Intelligence']

  return (
    <h1 className="dashboard-title" aria-label="Operations Map Intelligence">
      {words.map((word, index) => (
        <span style={{ animationDelay: `${index * 120}ms` }} key={word}>
          {word}
        </span>
      ))}
    </h1>
  )
}

function OpenLayersMap({
  mode,
  onViewChange,
}: {
  mode: MapMode
  onViewChange: (view: ViewState) => void
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const standardLayerRef = useRef<TileLayer<OSM> | null>(null)
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null)

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return
    }

    const standardLayer = new TileLayer({
      source: new OSM(),
      visible: true,
    })
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles &copy; Esri',
        maxZoom: 19,
      }),
      visible: false,
    })
    const view = new View({
      center: fromLonLat([PANGYO_VIEW.lon, PANGYO_VIEW.lat]),
      zoom: PANGYO_VIEW.zoom,
      minZoom: 6,
      maxZoom: 19,
    })
    const map = new Map({
      target: mapElementRef.current,
      layers: [standardLayer, satelliteLayer],
      view,
      controls: [],
    })

    function emitViewState() {
      const [lon, lat] = toLonLat(view.getCenter() ?? fromLonLat([PANGYO_VIEW.lon, PANGYO_VIEW.lat]))
      onViewChange({
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        zoom: Number((view.getZoom() ?? PANGYO_VIEW.zoom).toFixed(1)),
      })
    }

    map.on('moveend', emitViewState)
    mapRef.current = map
    standardLayerRef.current = standardLayer
    satelliteLayerRef.current = satelliteLayer

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      standardLayerRef.current = null
      satelliteLayerRef.current = null
    }
  }, [onViewChange])

  useEffect(() => {
    standardLayerRef.current?.setVisible(mode === 'standard')
    satelliteLayerRef.current?.setVisible(mode === 'satellite')
  }, [mode])

  return <div className="ol-map" ref={mapElementRef} />
}

function MetricChart({ data }: { data: MetricDatum[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const seriesRef = useRef<am5xy.ColumnSeries | null>(null)
  const trendSeriesRef = useRef<am5xy.LineSeries | null>(null)

  useLayoutEffect(() => {
    if (!chartRef.current) {
      return
    }

    const root = am5.Root.new(chartRef.current)
    root.setThemes([am5themesAnimated.new(root)])
    root.interfaceColors.set('grid', am5.color(0x263247))

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        paddingTop: 8,
        paddingRight: 4,
        paddingBottom: 0,
        paddingLeft: 0,
      }),
    )
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: 'label',
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 24,
        }),
      }),
    )
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 110,
        strictMinMax: true,
        renderer: am5xy.AxisRendererY.new(root, {}),
      }),
    )

    xAxis.get('renderer').labels.template.setAll({
      fill: am5.color(0x8b9ab3),
      fontSize: 12,
    })
    yAxis.get('renderer').labels.template.setAll({
      fill: am5.color(0x65748c),
      fontSize: 11,
    })
    xAxis.get('renderer').grid.template.set('visible', false)
    yAxis.get('renderer').grid.template.setAll({
      stroke: am5.color(0x263247),
      strokeOpacity: 0.65,
    })

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Signal',
        xAxis,
        yAxis,
        valueYField: 'value',
        categoryXField: 'label',
      }),
    )
    series.columns.template.setAll({
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      fill: am5.color(0x16d6a2),
      strokeOpacity: 0,
      width: am5.percent(54),
    })

    const trendSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Trend',
        xAxis,
        yAxis,
        valueYField: 'trend',
        categoryXField: 'label',
        stroke: am5.color(0x7aa7ff),
      }),
    )
    trendSeries.strokes.template.setAll({
      strokeWidth: 3,
    })
    trendSeries.bullets.push(() => {
      const bulletCircle = am5.Circle.new(root, {
        radius: 4,
        fill: am5.color(0x7aa7ff),
        stroke: am5.color(0x07101f),
        strokeWidth: 2,
      })

      return am5.Bullet.new(root, {
        sprite: bulletCircle,
      })
    })

    xAxis.data.setAll(data)
    series.data.setAll(data)
    trendSeries.data.setAll(data)
    series.appear(800)
    trendSeries.appear(900)
    chart.appear(800, 120)

    seriesRef.current = series
    trendSeriesRef.current = trendSeries

    return () => {
      root.dispose()
      seriesRef.current = null
      trendSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    seriesRef.current?.data.setAll(data)
    trendSeriesRef.current?.data.setAll(data)
  }, [data])

  return <div className="chart-canvas" ref={chartRef} />
}

function App() {
  const [viewState, setViewState] = useState<ViewState>(PANGYO_VIEW)
  const [mapMode, setMapMode] = useState<MapMode>('standard')
  const handleViewChange = useCallback((nextViewState: ViewState) => {
    setViewState(nextViewState)
  }, [])
  const chartData = useMemo(() => createMetricData(viewState), [viewState])
  const primaryMetric = chartData.reduce((total, item) => total + item.value, 0)

  return (
    <main className="dashboard">
      <div className="mesh-background" />
      <section className="dashboard-header">
        <div>
          <p className="kicker">React Study Command Center</p>
          <AnimatedHeadline />
        </div>
        <div className="header-metrics">
          <span>
            Center {viewState.lat.toFixed(3)}, {viewState.lon.toFixed(3)}
          </span>
          <strong>{primaryMetric}</strong>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p>Live telemetry</p>
              <h2>Viewport driven amCharts</h2>
            </div>
            <span className="pulse-dot">Map synced</span>
          </div>
          <MetricChart data={chartData} />
          <div className="chart-readout">
            {chartData.map((item) => (
              <span key={item.label}>
                {item.label}
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </article>

        <article className="panel map-dashboard-panel">
          <div className="map-toolbar">
            <div>
              <p>OpenLayers map</p>
              <h2>Pangyo Global Biz Center</h2>
            </div>
            <div className="segmented-control" aria-label="Map layer">
              <button
                className={mapMode === 'standard' ? 'active' : ''}
                type="button"
                onClick={() => setMapMode('standard')}
              >
                Normal
              </button>
              <button
                className={mapMode === 'satellite' ? 'active' : ''}
                type="button"
                onClick={() => setMapMode('satellite')}
              >
                Satellite
              </button>
            </div>
          </div>
          <div className="map-frame">
            <OpenLayersMap mode={mapMode} onViewChange={handleViewChange} />
            <div className="map-reticle" />
            <div className="map-status-card">
              <span>Zoom {viewState.zoom}</span>
              <strong>{mapMode === 'satellite' ? 'Satellite' : 'Normal'} layer</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="project-story panel">
        <div className="story-line" />
        <p className="kicker">Project brief</p>
        <h2>Spring Boot and React TypeScript real-time map dashboard</h2>
        <p>
          Map movement is the center of the data flow, and the amCharts panel reacts immediately
          to viewport changes. Weather, traffic, and operational APIs can be added later with the
          same pattern.
        </p>
      </section>
    </main>
  )
}

export default App
