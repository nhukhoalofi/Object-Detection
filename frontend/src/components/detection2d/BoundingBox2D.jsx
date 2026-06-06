import { getClassNameVI } from '../../utils/formatUtils.js'

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeBBox2D(obj) {
  const rawBBox = obj?.bbox_2d ?? obj?.bbox

  if (Array.isArray(rawBBox) && rawBBox.length >= 4) {
    const nx1 = toNumber(rawBBox[0])
    const ny1 = toNumber(rawBBox[1])
    const nx2 = toNumber(rawBBox[2])
    const ny2 = toNumber(rawBBox[3])
    if (nx1 !== null && ny1 !== null && nx2 !== null && ny2 !== null) {
      return { x1: nx1, y1: ny1, x2: nx2, y2: ny2 }
    }
  }

  if (rawBBox && typeof rawBBox === 'object') {
    const hasCorners = ['x1', 'y1', 'x2', 'y2'].every((k) => rawBBox[k] !== undefined)
    if (hasCorners) {
      const nx1 = toNumber(rawBBox.x1)
      const ny1 = toNumber(rawBBox.y1)
      const nx2 = toNumber(rawBBox.x2)
      const ny2 = toNumber(rawBBox.y2)
      if (nx1 !== null && ny1 !== null && nx2 !== null && ny2 !== null) {
        return { x1: nx1, y1: ny1, x2: nx2, y2: ny2 }
      }
    }

    const hasSize = ['x', 'y', 'width', 'height'].every((k) => rawBBox[k] !== undefined)
    if (hasSize) {
      const nx = toNumber(rawBBox.x)
      const ny = toNumber(rawBBox.y)
      const nwidth = toNumber(rawBBox.width)
      const nheight = toNumber(rawBBox.height)
      if (nx !== null && ny !== null && nwidth !== null && nheight !== null) {
        return { x1: nx, y1: ny, x2: nx + nwidth, y2: ny + nheight }
      }
    }
  }

  return null
}

export default function BoundingBox2D({ obj, scaleX, scaleY }) {
  const bbox = normalizeBBox2D(obj)
  if (!bbox) {
    return null
  }

  const nameRaw = obj?.class_name ?? obj?.className ?? obj?.label ?? obj?.name ?? 'Unknown'
  const nameVI = getClassNameVI(nameRaw)
  const confPct = typeof obj?.confidence === 'number' ? Math.round(obj.confidence * 100) : null
  const hasTrackId = obj?.track_id !== null && obj?.track_id !== undefined

  const left = bbox.x1 * scaleX
  const top = bbox.y1 * scaleY
  const width = (bbox.x2 - bbox.x1) * scaleX
  const height = (bbox.y2 - bbox.y1) * scaleY

  return (
    <div
      className="absolute"
      style={{ left, top, width, height, pointerEvents: 'none' }}
    >
      {/* Box */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{ border: '1.5px solid rgba(255,255,255,0.85)' }}
      />
      {/* Corner ticks */}
      {[
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5"
          style={{
            ...pos,
            borderTop: pos.top === 0 ? '2px solid #fff' : undefined,
            borderBottom: pos.bottom === 0 ? '2px solid #fff' : undefined,
            borderLeft: pos.left === 0 ? '2px solid #fff' : undefined,
            borderRight: pos.right === 0 ? '2px solid #fff' : undefined,
          }}
        />
      ))}
      {/* Label */}
      <div
        className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
      >
        {nameVI}{confPct !== null ? ` ${confPct}%` : ''}{hasTrackId ? ` #${obj.track_id}` : ''}
      </div>
    </div>
  )
}
