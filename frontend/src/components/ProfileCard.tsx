import { useRef, type CSSProperties, type PointerEvent } from 'react'
import './ProfileCard.css'

type ProfileCardProps = {
  avatarUrl: string
  name: string
  title: string
  handle: string
  status?: string
  compact?: boolean
  onActivate?: () => void
}

type ProfileCardStyle = CSSProperties & {
  '--pointer-x': string
  '--pointer-y': string
  '--rotate-x': string
  '--rotate-y': string
}

function ProfileCard({
  avatarUrl,
  name,
  title,
  handle,
  status = 'Online',
  compact = false,
  onActivate,
}: ProfileCardProps) {
  const cardRef = useRef<HTMLButtonElement | null>(null)

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const card = cardRef.current
    if (!card) {
      return
    }

    const bounds = card.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    card.style.setProperty('--pointer-x', `${x * 100}%`)
    card.style.setProperty('--pointer-y', `${y * 100}%`)
    card.style.setProperty('--rotate-x', `${(0.5 - y) * 10}deg`)
    card.style.setProperty('--rotate-y', `${(x - 0.5) * 12}deg`)
  }

  function resetTilt() {
    const card = cardRef.current
    if (!card) {
      return
    }
    card.style.setProperty('--pointer-x', '50%')
    card.style.setProperty('--pointer-y', '50%')
    card.style.setProperty('--rotate-x', '0deg')
    card.style.setProperty('--rotate-y', '0deg')
  }

  const initialStyle: ProfileCardStyle = {
    '--pointer-x': '50%',
    '--pointer-y': '50%',
    '--rotate-x': '0deg',
    '--rotate-y': '0deg',
  }

  return (
    <button
      ref={cardRef}
      className={`profile-card ${compact ? 'profile-card--compact' : 'profile-card--full'}`}
      style={initialStyle}
      type="button"
      onClick={onActivate}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      aria-label={`Open ${name} profile page`}
    >
      <span className="profile-card-glow" />
      <span className="profile-card-glare" />
      <span className="profile-card-content">
        <span className="profile-avatar-wrap">
          <img src={avatarUrl} alt={`${name} profile`} className="profile-avatar" />
          <span className="profile-status-dot" />
        </span>
        <span className="profile-copy">
          <strong>{name}</strong>
          <span>{title}</span>
          {!compact && <small>@{handle} / {status}</small>}
        </span>
        {compact && <span className="profile-arrow" aria-hidden="true">&gt;</span>}
      </span>
    </button>
  )
}

export default ProfileCard
