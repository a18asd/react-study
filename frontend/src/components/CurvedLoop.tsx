import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import './CurvedLoop.css'

type CurvedLoopProps = {
  marqueeText: string
  speed?: number
  className?: string
  curveAmount?: number
  direction?: 'left' | 'right'
  interactive?: boolean
}

function CurvedLoop({
  marqueeText,
  speed = 2,
  className,
  curveAmount = 120,
  direction = 'left',
  interactive = true,
}: CurvedLoopProps) {
  const text = useMemo(() => {
    const hasTrailingSpace = /\s|\u00a0$/.test(marqueeText)
    return `${hasTrailingSpace ? marqueeText.replace(/\s+$/, '') : marqueeText}\u00a0`
  }, [marqueeText])
  const measureRef = useRef<SVGTextElement | null>(null)
  const textPathRef = useRef<SVGTextPathElement | null>(null)
  const dragRef = useRef(false)
  const lastXRef = useRef(0)
  const directionRef = useRef<'left' | 'right'>(direction)
  const velocityRef = useRef(0)
  const [spacing, setSpacing] = useState(0)
  const [offset, setOffset] = useState(0)
  const pathId = `curve-${useId().replace(/:/g, '')}`
  const pathD = `M-100,40 Q500,${40 + curveAmount} 1540,40`
  const repeatedText = spacing
    ? Array(Math.ceil(1800 / spacing) + 2)
        .fill(text)
        .join('')
    : text
  const ready = spacing > 0

  useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength())
    }
  }, [className, text])

  useEffect(() => {
    if (!spacing || !textPathRef.current) {
      return
    }

    const initialOffset = -spacing
    textPathRef.current.setAttribute('startOffset', `${initialOffset}px`)
    setOffset(initialOffset)
  }, [spacing])

  useEffect(() => {
    if (!ready || !spacing) {
      return
    }

    let frameId = 0
    const animate = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = directionRef.current === 'right' ? speed : -speed
        const currentOffset = Number.parseFloat(textPathRef.current.getAttribute('startOffset') ?? '0')
        let nextOffset = currentOffset + delta

        if (nextOffset <= -spacing) {
          nextOffset += spacing
        }
        if (nextOffset > 0) {
          nextOffset -= spacing
        }

        textPathRef.current.setAttribute('startOffset', `${nextOffset}px`)
      }
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ready, spacing, speed])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive) {
      return
    }
    dragRef.current = true
    lastXRef.current = event.clientX
    velocityRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !dragRef.current || !textPathRef.current) {
      return
    }

    const deltaX = event.clientX - lastXRef.current
    lastXRef.current = event.clientX
    velocityRef.current = deltaX
    const currentOffset = Number.parseFloat(textPathRef.current.getAttribute('startOffset') ?? '0')
    let nextOffset = currentOffset + deltaX

    if (nextOffset <= -spacing) {
      nextOffset += spacing
    }
    if (nextOffset > 0) {
      nextOffset -= spacing
    }
    textPathRef.current.setAttribute('startOffset', `${nextOffset}px`)
  }

  function endDrag() {
    if (!interactive) {
      return
    }
    dragRef.current = false
    directionRef.current = velocityRef.current > 0 ? 'right' : 'left'
  }

  return (
    <div
      className="curved-loop"
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg className="curved-loop-svg" viewBox="0 0 1440 180">
        <text ref={measureRef} xmlSpace="preserve" className={className} visibility="hidden">
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" />
        </defs>
        {ready && (
          <text xmlSpace="preserve" className={className}>
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${offset}px`}>
              {repeatedText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  )
}

export default CurvedLoop
