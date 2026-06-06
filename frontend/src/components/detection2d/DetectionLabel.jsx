import { getClassNameVI } from '../../utils/formatUtils.js'

export default function DetectionLabel({ className, confidence, trackId }) {
  const nameVI = getClassNameVI(className)
  const confPct = confidence !== undefined ? Math.round(confidence * 100) : null
  const hasTrackId = trackId !== null && trackId !== undefined

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap bg-white/90 text-neutral-900 border border-neutral-300">
      {nameVI}
      {confPct !== null && ` ${confPct}%`}
      {hasTrackId && ` #${trackId}`}
    </span>
  )
}
