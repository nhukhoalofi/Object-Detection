import { useEffect, useMemo, useState } from 'react'
import FeatureUnavailable from '../common/FeatureUnavailable.jsx'
import { getClassNameVI } from '../../utils/formatUtils.js'

const CLASS_COLORS = {
  person: '#60a5fa',
  rider: '#c084fc',
  car: '#f59e0b',
  bus: '#fb923c',
  truck: '#f97316',
  bike: '#34d399',
  bicycle: '#34d399',
  motor: '#2dd4bf',
  'traffic light': '#facc15',
  'traffic sign': '#a3e635',
  train: '#f87171',
}

const DEFAULT_IMAGE_WIDTH = 640
const DEFAULT_IMAGE_HEIGHT = 480
const DEFAULT_VIDEO_FPS = 30
const MISSING_FRAME_HOLD_SECONDS = 0.25
const MAX_OBJECTS = 24
function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeBbox2D(rawBBox) {
  if (!rawBBox) return null

  if (Array.isArray(rawBBox) && rawBBox.length >= 4) {
    const x1 = toNumber(rawBBox[0], null)
    const y1 = toNumber(rawBBox[1], null)
    const x2 = toNumber(rawBBox[2], null)
    const y2 = toNumber(rawBBox[3], null)
    if ([x1, y1, x2, y2].some((value) => value === null)) return null
    return {
      x1,
      y1,
      x2,
      y2,
      width: Math.max(x2 - x1, 1),
      height: Math.max(y2 - y1, 1),
    }
  }

  const x1 = toNumber(rawBBox.x1 ?? rawBBox.x ?? rawBBox.left, null)
  const y1 = toNumber(rawBBox.y1 ?? rawBBox.y ?? rawBBox.top, null)
  const x2 = rawBBox.x2 ?? rawBBox.right ?? rawBBox.xmax
  const y2 = rawBBox.y2 ?? rawBBox.bottom ?? rawBBox.ymax
  const width = rawBBox.width ?? rawBBox.w
  const height = rawBBox.height ?? rawBBox.h

  if (x1 === null || y1 === null) return null

  if (x2 !== undefined && y2 !== undefined) {
    const nx2 = toNumber(x2, null)
    const ny2 = toNumber(y2, null)
    if (nx2 === null || ny2 === null) return null
    return {
      x1,
      y1,
      x2: nx2,
      y2: ny2,
      width: Math.max(nx2 - x1, 1),
      height: Math.max(ny2 - y1, 1),
    }
  }

  if (width !== undefined && height !== undefined) {
    const nWidth = Math.max(toNumber(width, 1), 1)
    const nHeight = Math.max(toNumber(height, 1), 1)
    return {
      x1,
      y1,
      x2: x1 + nWidth,
      y2: y1 + nHeight,
      width: nWidth,
      height: nHeight,
    }
  }

  return null
}

function classDimensions(label, bboxHeightRatio) {
  const safeRatio = clamp(bboxHeightRatio, 0.05, 0.85)
  const visualHeight = clamp(1.1 + safeRatio * 3.2, 1.2, 3.4)

  if (label === 'person') {
    return { width: 0.65, height: visualHeight, depth: 0.45 }
  }

  if (label === 'rider') {
    return { width: 0.7, height: visualHeight, depth: 0.6 }
  }

  if (label === 'car') {
    return { width: 2.0, height: clamp(visualHeight * 0.7, 1.1, 1.7), depth: 3.2 }
  }

  if (label === 'bus') {
    return { width: 2.6, height: clamp(visualHeight, 2.0, 3.2), depth: 6.2 }
  }

  if (label === 'truck') {
    return { width: 2.5, height: clamp(visualHeight, 2.0, 3.0), depth: 5.5 }
  }

  if (label === 'bike' || label === 'bicycle') {
    return { width: 1.5, height: clamp(visualHeight * 0.85, 1.0, 1.8), depth: 0.55 }
  }

  if (label === 'motor') {
    return { width: 1.0, height: clamp(visualHeight * 0.9, 1.0, 1.8), depth: 1.8 }
  }

  if (label === 'traffic light') {
    return { width: 0.35, height: clamp(visualHeight, 0.8, 1.8), depth: 0.25 }
  }

  if (label === 'traffic sign') {
    return { width: 0.8, height: clamp(visualHeight * 0.45, 0.5, 1.2), depth: 0.2 }
  }

  if (label === 'train') {
    return { width: 3.0, height: clamp(visualHeight, 2.0, 3.6), depth: 7.5 }
  }

  return { width: 1.0, height: visualHeight, depth: 0.8 }
}

function fallback3DFromBBox(obj, imageWidth, imageHeight) {
  const bbox = normalizeBbox2D(obj?.bbox_2d ?? obj?.bbox)
  if (!bbox) return null

  const label = obj.label || obj.class_name || obj.className || 'object'
  const centerX = (bbox.x1 + bbox.x2) / 2
  const centerY = (bbox.y1 + bbox.y2) / 2
  const bboxHeightRatio = bbox.height / Math.max(imageHeight, 1)
  const depth = toNumber(obj.depth, null) ?? clamp(1000 / Math.max(bbox.height, 1), 1.2, 18)
  const x = ((centerX - imageWidth / 2) / imageWidth) * depth * 2.4
  const yOffset = ((centerY - imageHeight / 2) / imageHeight) * depth * 0.45
  const size = classDimensions(label, bboxHeightRatio)

  return {
    source: 'bbox_2d',
    depth,
    center: {
      x: clamp(x, -8, 8),
      y: yOffset,
      z: depth,
    },
    size,
  }
}

function normalize3DObject(obj, index, imageWidth, imageHeight) {
  const label = obj.label || obj.class_name || obj.className || 'object'
  const bbox3d = obj.bbox_3d
  const fallback = fallback3DFromBBox(obj, imageWidth, imageHeight)

  if (!bbox3d && !fallback) return null

  const source = bbox3d ? 'bbox_3d' : fallback.source
  const centerSource = bbox3d?.center ?? fallback?.center ?? {}
  const sizeSource = bbox3d?.size ?? fallback?.size ?? {}
  const depth = toNumber(obj.depth ?? centerSource?.z ?? fallback?.depth, fallback?.depth ?? 4)
  const size = {
    width: clamp(toNumber(sizeSource?.width, fallback?.size?.width ?? 1), 0.25, 4.5),
    height: clamp(toNumber(sizeSource?.height, fallback?.size?.height ?? 1.6), 0.5, 4.0),
    depth: clamp(toNumber(sizeSource?.depth, fallback?.size?.depth ?? 0.8), 0.25, 5.0),
  }
  const center = {
    x: clamp(toNumber(centerSource?.x, fallback?.center?.x ?? 0), -9, 9),
    y: toNumber(centerSource?.y, fallback?.center?.y ?? 0),
    z: clamp(toNumber(centerSource?.z, depth), 0.8, 18),
  }

  return {
    id: obj.id ?? obj.track_id ?? index + 1,
    trackId: obj.track_id,
    label,
    displayLabel: getClassNameVI(label),
    confidence: toNumber(obj.confidence, null),
    color: CLASS_COLORS[label] || '#a78bfa',
    source,
    depth,
    center,
    size,
  }
}

function selectObjects(objects) {
  const tracked = new Map()
  const untracked = []

  objects.forEach((obj, index) => {
    if (obj?.track_id !== null && obj?.track_id !== undefined) {
      tracked.set(`${obj.label || obj.class_name || 'object'}-${obj.track_id}`, obj)
    } else {
      untracked.push({ ...obj, id: obj?.id ?? index + 1 })
    }
  })

  const selected = tracked.size ? [...tracked.values()] : untracked
  return selected.slice(0, MAX_OBJECTS)
}

function createProjector(width = 1200, height = 620) {
  const origin = { x: width / 2, y: height * 0.68 }
  const xScale = 38
  const zScale = 21
  const yScale = 38

  return function project(point) {
    return {
      x: origin.x + (point.x - point.z) * xScale,
      y: origin.y + (point.x + point.z) * zScale - point.y * yScale,
    }
  }
}

function linePath(project, start, end) {
  const a = project(start)
  const b = project(end)
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

function createBoxEdges(box, project) {
  const { center, size } = box
  const x0 = center.x - size.width / 2
  const x1 = center.x + size.width / 2
  const y0 = 0
  const y1 = size.height
  const z0 = center.z - size.depth / 2
  const z1 = center.z + size.depth / 2

  const corners = {
    bfl: { x: x0, y: y0, z: z0 },
    bfr: { x: x1, y: y0, z: z0 },
    bbr: { x: x1, y: y0, z: z1 },
    bbl: { x: x0, y: y0, z: z1 },
    tfl: { x: x0, y: y1, z: z0 },
    tfr: { x: x1, y: y1, z: z0 },
    tbr: { x: x1, y: y1, z: z1 },
    tbl: { x: x0, y: y1, z: z1 },
  }

  const edges = [
    ['bfl', 'bfr'],
    ['bfr', 'bbr'],
    ['bbr', 'bbl'],
    ['bbl', 'bfl'],
    ['tfl', 'tfr'],
    ['tfr', 'tbr'],
    ['tbr', 'tbl'],
    ['tbl', 'tfl'],
    ['bfl', 'tfl'],
    ['bfr', 'tfr'],
    ['bbr', 'tbr'],
    ['bbl', 'tbl'],
  ]

  const topCenter = project({ x: center.x, y: y1 + 0.35, z: center.z })

  return {
    paths: edges.map(([start, end]) => linePath(project, corners[start], corners[end])),
    topCenter,
  }
}

function Grid({ project }) {
  const lines = []
  const min = -10
  const max = 10
  const zMax = 18

  for (let i = min; i <= max; i += 1) {
    lines.push({
      key: `x-${i}`,
      path: linePath(project, { x: i, y: 0, z: 0 }, { x: i, y: 0, z: zMax }),
      major: i === 0 || i % 5 === 0,
    })
  }

  for (let z = 0; z <= zMax; z += 1) {
    lines.push({
      key: `z-${z}`,
      path: linePath(project, { x: min, y: 0, z }, { x: max, y: 0, z }),
      major: z === 0 || z % 5 === 0,
    })
  }

  const xEnd = project({ x: 8, y: 0, z: 0 })
  const yEnd = project({ x: 0, y: 6, z: 0 })
  const zEnd = project({ x: 0, y: 0, z: 8 })

  return (
    <g>
      {lines.map((line) => (
        <path
          key={line.key}
          d={line.path}
          fill="none"
          stroke={line.major ? '#40454f' : '#2b3038'}
          strokeWidth={line.major ? 1.4 : 1}
        />
      ))}
      <path d={linePath(project, { x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 })} stroke="#aeb8c8" strokeWidth="3" />
      <path d={linePath(project, { x: 0, y: 0, z: 0 }, { x: 0, y: 6, z: 0 })} stroke="#aeb8c8" strokeWidth="3" />
      <path d={linePath(project, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 8 })} stroke="#aeb8c8" strokeWidth="3" />
      <text x={xEnd.x + 12} y={xEnd.y + 4} fill="#e5edf8" fontSize="18" fontWeight="700">X</text>
      <text x={yEnd.x - 2} y={yEnd.y - 12} fill="#e5edf8" fontSize="18" fontWeight="700">Y</text>
      <text x={zEnd.x - 22} y={zEnd.y + 10} fill="#e5edf8" fontSize="18" fontWeight="700">Z</text>
    </g>
  )
}

function ObjectBox({ object, project, labelOffset = 0 }) {
  const box = createBoxEdges(object, project)
  const distance = Number.isFinite(object.depth) ? `${object.depth.toFixed(1)} m` : '-'
  const suffix = object.trackId !== null && object.trackId !== undefined ? `#${object.trackId}` : `#${object.id}`
  const label = `${object.displayLabel} ${suffix}`
  const labelY = box.topCenter.y - 10 - labelOffset

  return (
    <g>
      {box.paths.map((path, index) => (
        <path
          key={`${object.id}-${index}`}
          d={path}
          fill="none"
          stroke={object.color}
          strokeWidth="2.3"
          opacity="0.92"
        />
      ))}
      <circle cx={box.topCenter.x} cy={box.topCenter.y} r="3.5" fill={object.color} />
      <text
        x={box.topCenter.x}
        y={labelY}
        fill="#ffffff"
        fontSize="15"
        fontWeight="800"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#111827"
        strokeWidth="4"
      >
        {label}
      </text>
      <text
        x={box.topCenter.x}
        y={labelY + 22}
        fill="#d1d5db"
        fontSize="12"
        fontWeight="600"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#111827"
        strokeWidth="3"
      >
        {distance}
      </text>
    </g>
  )
}

export default function ThreeDPanel({
  objects = [],
  frames = [],
  fps = null,
  mediaType = 'image',
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
}) {
  const safeFrames = Array.isArray(frames) ? frames : []
  const isVideo = mediaType === 'video' || safeFrames.length > 1
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [lastSceneSnapshot, setLastSceneSnapshot] = useState(null)
  const maxFrameIndex = Math.max(safeFrames.length - 1, 0)
  const selectedFrame = safeFrames[clamp(frameIndex, 0, maxFrameIndex)] ?? null
  const frameObjects = isVideo
    ? (Array.isArray(selectedFrame?.objects) ? selectedFrame.objects : [])
    : objects
  const safeImageWidth = imageWidth || DEFAULT_IMAGE_WIDTH
  const safeImageHeight = imageHeight || DEFAULT_IMAGE_HEIGHT
  const selectedObjects = useMemo(() => selectObjects(frameObjects), [frameObjects])
  const sceneObjects = useMemo(() => (
    selectedObjects
      .map((obj, index) => normalize3DObject(obj, index, safeImageWidth, safeImageHeight))
      .filter(Boolean)
      .sort((a, b) => b.center.z - a.center.z)
  ), [safeImageHeight, safeImageWidth, selectedObjects])
  const project = createProjector()
  const frameTimestamp = selectedFrame?.timestamp ?? (fps ? frameIndex / fps : 0)
  const playbackFps = clamp(toNumber(fps, 8), 1, 12)
  const holdMissingFrames = Math.max(2, Math.round(toNumber(fps, DEFAULT_VIDEO_FPS) * MISSING_FRAME_HOLD_SECONDS))
  const missingFrameGap = lastSceneSnapshot ? frameIndex - lastSceneSnapshot.frameIndex : Number.POSITIVE_INFINITY
  const shouldHoldLastScene = Boolean(
    isVideo
      && !sceneObjects.length
      && lastSceneSnapshot?.objects?.length
      && missingFrameGap > 0
      && missingFrameGap <= holdMissingFrames
  )
  const renderSceneObjects = shouldHoldLastScene ? lastSceneSnapshot.objects : sceneObjects

  useEffect(() => {
    if (!isVideo || !sceneObjects.length) return

    setLastSceneSnapshot({
      frameIndex,
      timestamp: frameTimestamp,
      objects: sceneObjects,
    })
  }, [frameIndex, frameTimestamp, isVideo, sceneObjects])

  useEffect(() => {
    if (!isVideo || frameIndex <= maxFrameIndex) return
    setFrameIndex(maxFrameIndex)
  }, [frameIndex, isVideo, maxFrameIndex])

  useEffect(() => {
    if (!isVideo || !playing || maxFrameIndex === 0) return undefined

    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= maxFrameIndex) return 0
        return current + 1
      })
    }, 1000 / playbackFps)

    return () => window.clearInterval(interval)
  }, [isVideo, maxFrameIndex, playbackFps, playing])

  if (!objects.length && !safeFrames.length) {
    return (
      <FeatureUnavailable
        title="Chưa có vật thể"
        message="Chạy nhận diện trước để xem vật thể trong không gian 3D."
      />
    )
  }

  if (!renderSceneObjects.length) {
    const hasObjectsInFrame = frameObjects.length > 0

    return (
      <div className="space-y-3">
        {isVideo && (
          <VideoFrameControls
            frameIndex={frameIndex}
            maxFrameIndex={maxFrameIndex}
            playing={playing}
            timestamp={frameTimestamp}
            onFrameIndexChange={setFrameIndex}
            onPlayingChange={setPlaying}
          />
        )}
        <EmptyScene
          title={hasObjectsInFrame ? 'Chưa có vị trí 3D' : 'Không có vật thể ở thời điểm này'}
          message={
            hasObjectsInFrame
              ? 'Vật thể này chưa có đủ dữ liệu vị trí để hiển thị trong không gian 3D.'
              : 'Không phát hiện vật thể phù hợp ở thời điểm này.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2 text-xs font-mono">
        <span className="rounded border border-neutral-200 bg-white px-2 py-1 text-neutral-700">
          {renderSceneObjects.length} đối tượng
        </span>
        {isVideo && (
          <span className="rounded border border-neutral-200 bg-white px-2 py-1 text-neutral-700">
            Khung {frameIndex + 1}/{maxFrameIndex + 1}
          </span>
        )}
        {shouldHoldLastScene && (
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
            Đang giữ khung {lastSceneSnapshot.frameIndex + 1}
          </span>
        )}
      </div>

      {isVideo && (
        <VideoFrameControls
          frameIndex={frameIndex}
          maxFrameIndex={maxFrameIndex}
          playing={playing}
          timestamp={frameTimestamp}
          onFrameIndexChange={setFrameIndex}
          onPlayingChange={setPlaying}
        />
      )}

      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-[#141414]">
        <div className="absolute right-3 top-3 z-10 rounded border border-white/10 bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm">
          {renderSceneObjects.length} đối tượng
        </div>
        {shouldHoldLastScene && (
          <div className="absolute left-3 top-3 z-10 rounded border border-blue-300/40 bg-blue-950/80 px-3 py-1.5 text-xs font-medium text-blue-100 shadow-sm">
            Đang giữ khung {lastSceneSnapshot.frameIndex + 1}
          </div>
        )}
        <svg
          viewBox="0 0 1200 620"
          className="block h-[420px] w-full sm:h-[520px]"
          role="img"
          aria-label="Trực quan hóa bounding box 3D"
        >
          <defs>
            <radialGradient id="sceneGlow" cx="50%" cy="48%" r="70%">
              <stop offset="0%" stopColor="#242832" />
              <stop offset="72%" stopColor="#151515" />
              <stop offset="100%" stopColor="#111111" />
            </radialGradient>
          </defs>
          <rect width="1200" height="620" fill="url(#sceneGlow)" />
          <Grid project={project} />
          {renderSceneObjects.map((object, index) => (
            <ObjectBox
              key={`${object.label}-${object.id}-${object.trackId ?? 'none'}`}
              object={object}
              project={project}
              labelOffset={(index % 4) * 18}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

function EmptyScene({ title, message }) {
  const project = createProjector()

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-[#141414]">
      <svg
        viewBox="0 0 1200 620"
        className="block h-[420px] w-full sm:h-[520px]"
        role="img"
        aria-label={title}
      >
        <defs>
          <radialGradient id="emptySceneGlow" cx="50%" cy="48%" r="70%">
            <stop offset="0%" stopColor="#242832" />
            <stop offset="72%" stopColor="#151515" />
            <stop offset="100%" stopColor="#111111" />
          </radialGradient>
        </defs>
        <rect width="1200" height="620" fill="url(#emptySceneGlow)" />
        <Grid project={project} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="rounded-lg border border-white/10 bg-black/45 px-6 py-5 shadow-lg backdrop-blur-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
            i
          </div>
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-neutral-300">{message}</p>
        </div>
      </div>
    </div>
  )
}

function VideoFrameControls({
  frameIndex,
  maxFrameIndex,
  playing,
  timestamp,
  onFrameIndexChange,
  onPlayingChange,
}) {
  const canScrub = maxFrameIndex > 0

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-8 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
          onClick={() => onPlayingChange(!playing)}
          disabled={!canScrub}
        >
          {playing ? 'Tạm dừng' : 'Phát'}
        </button>
        <button
          type="button"
          className="h-8 rounded-md border border-neutral-200 bg-neutral-50 px-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
          onClick={() => onFrameIndexChange(Math.max(frameIndex - 1, 0))}
          disabled={!canScrub || frameIndex <= 0}
        >
          Trước
        </button>
        <button
          type="button"
          className="h-8 rounded-md border border-neutral-200 bg-neutral-50 px-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
          onClick={() => onFrameIndexChange(Math.min(frameIndex + 1, maxFrameIndex))}
          disabled={!canScrub || frameIndex >= maxFrameIndex}
        >
          Sau
        </button>
      </div>
      <input
        type="range"
        min="0"
        max={maxFrameIndex}
        step="1"
        value={frameIndex}
        onChange={(event) => onFrameIndexChange(Number(event.target.value))}
        disabled={!canScrub}
        className="min-w-0 flex-1 accent-neutral-900"
      />
      <div className="flex items-center justify-between gap-3 text-xs font-mono text-neutral-600 sm:min-w-[170px]">
        <span>Khung {frameIndex + 1}</span>
        <span>{toNumber(timestamp, 0).toFixed(2)}s</span>
      </div>
    </div>
  )
}
