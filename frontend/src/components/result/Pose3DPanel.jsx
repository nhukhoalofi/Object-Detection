import { useEffect, useMemo, useState } from 'react'
import FeatureUnavailable from '../common/FeatureUnavailable.jsx'
import { getClassNameVI } from '../../utils/formatUtils.js'

const MIN_KEYPOINT_CONFIDENCE = 0.2
const DEFAULT_VIDEO_FPS = 30
const MISSING_FRAME_HOLD_SECONDS = 0.25

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function isVisibleKeypoint(point) {
  if (!Array.isArray(point) || point.length < 2) return false

  const x = Number(point[0])
  const y = Number(point[1])
  const confidence = point.length > 2 ? Number(point[2]) : 1

  return (
    Number.isFinite(x)
    && Number.isFinite(y)
    && Number.isFinite(confidence)
    && x > 0
    && y > 0
    && confidence >= MIN_KEYPOINT_CONFIDENCE
  )
}

function normalizeBbox2D(obj) {
  const bbox = obj?.bbox_2d ?? obj?.bbox
  if (!bbox) return null

  if (Array.isArray(bbox) && bbox.length >= 4) {
    const x1 = toNumber(bbox[0], null)
    const y1 = toNumber(bbox[1], null)
    const x2 = toNumber(bbox[2], null)
    const y2 = toNumber(bbox[3], null)
    if ([x1, y1, x2, y2].some((value) => value === null)) return null
    return { x1, y1, x2, y2, width: Math.max(x2 - x1, 1), height: Math.max(y2 - y1, 1) }
  }

  if (typeof bbox === 'object') {
    const x1 = toNumber(bbox.x1 ?? bbox.x ?? bbox.left, null)
    const y1 = toNumber(bbox.y1 ?? bbox.y ?? bbox.top, null)
    const x2 = toNumber(bbox.x2 ?? bbox.right ?? bbox.xmax, null)
    const y2 = toNumber(bbox.y2 ?? bbox.bottom ?? bbox.ymax, null)
    if ([x1, y1, x2, y2].some((value) => value === null)) return null
    return { x1, y1, x2, y2, width: Math.max(x2 - x1, 1), height: Math.max(y2 - y1, 1) }
  }

  return null
}

function getPoseObjects(objects) {
  return (Array.isArray(objects) ? objects : [])
    .filter((obj) => Array.isArray(obj.keypoints) && obj.keypoints.some(isVisibleKeypoint))
}

function createPoseProjector(width = 1000, height = 620) {
  const origin = { x: width / 2, y: height * 0.72 }
  const xScale = 260
  const yScale = 250
  const zScale = 46

  return function project(point) {
    return {
      x: origin.x + point.x * xScale - point.z * zScale,
      y: origin.y - point.y * yScale - point.z * zScale * 0.45,
    }
  }
}

function linePath(project, start, end) {
  const a = project(start)
  const b = project(end)
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

function buildPosePoints(obj) {
  const bbox = normalizeBbox2D(obj)
  if (!bbox) return []

  const depth = toNumber(obj.depth ?? obj.bbox_3d?.center?.z, 4)
  const normalizedDepth = clamp(depth / 12, 0.08, 0.85)

  return obj.keypoints
    .map((point, index) => {
      if (!isVisibleKeypoint(point)) return null

      const x = ((toNumber(point[0], bbox.x1) - bbox.x1) / bbox.width) - 0.5
      const y = 1 - ((toNumber(point[1], bbox.y1) - bbox.y1) / bbox.height)

      return {
        index,
        confidence: toNumber(point[2], 1),
        x: clamp(x, -0.6, 0.6),
        y: clamp(y, 0, 1.05),
        z: normalizedDepth,
      }
    })
    .filter(Boolean)
}

function PoseSkeleton({ obj, index, project }) {
  const points = buildPosePoints(obj)
  if (!points.length) return null

  const pointByIndex = new Map(points.map((point) => [point.index, point]))
  const skeleton = Array.isArray(obj.skeleton) ? obj.skeleton : []
  const label = getClassNameVI(obj.label || obj.class_name || 'person')
  const depth = toNumber(obj.depth ?? obj.bbox_3d?.center?.z, null)
  const leftShift = (index % 3 - 1) * 230

  function shifted(point) {
    return { ...point, x: point.x + leftShift / 260 }
  }

  const head = pointByIndex.get(0) ? project(shifted(pointByIndex.get(0))) : null

  return (
    <g>
      {skeleton.map((pair, pairIndex) => {
        const first = pointByIndex.get(pair[0])
        const second = pointByIndex.get(pair[1])
        if (!first || !second) return null

        return (
          <path
            key={`pose3d-line-${index}-${pairIndex}`}
            d={linePath(project, shifted(first), shifted(second))}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.92"
          />
        )
      })}
      {points.map((point) => {
        const projected = project(shifted(point))
        return (
          <circle
            key={`pose3d-point-${index}-${point.index}`}
            cx={projected.x}
            cy={projected.y}
            r="5.5"
            fill="#f472b6"
            stroke="#ffffff"
            strokeWidth="2"
          />
        )
      })}
      {head && (
        <>
          <text
            x={head.x}
            y={head.y - 26}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="16"
            fontWeight="800"
            paintOrder="stroke"
            stroke="#111827"
            strokeWidth="3.5"
          >
            {label} #{obj.track_id ?? obj.id ?? index + 1}
          </text>
          <text
            x={head.x}
            y={head.y - 3}
            textAnchor="middle"
            fill="#d1d5db"
            fontSize="12"
            fontWeight="700"
            paintOrder="stroke"
            stroke="#111827"
            strokeWidth="4"
          >
            {depth !== null ? `${depth.toFixed(1)} m` : 'Dáng người'}
          </text>
        </>
      )}
    </g>
  )
}

function PoseGrid({ project }) {
  const lines = []

  for (let x = -1.5; x <= 1.5; x += 0.25) {
    lines.push({
      key: `x-${x}`,
      start: { x, y: 0, z: 0 },
      end: { x, y: 0, z: 1 },
      major: Math.abs(x) < 0.01 || Math.abs(x % 0.5) < 0.01,
    })
  }

  for (let z = 0; z <= 1; z += 0.1) {
    lines.push({
      key: `z-${z}`,
      start: { x: -1.5, y: 0, z },
      end: { x: 1.5, y: 0, z },
      major: Math.abs(z % 0.5) < 0.01,
    })
  }

  return (
    <g>
      {lines.map((line) => (
        <path
          key={line.key}
          d={linePath(project, line.start, line.end)}
          fill="none"
          stroke={line.major ? '#4b5563' : '#2f3540'}
          strokeWidth={line.major ? 1.5 : 1}
        />
      ))}
      <path d={linePath(project, { x: -1.45, y: 0, z: 0 }, { x: 1.45, y: 0, z: 0 })} stroke="#94a3b8" strokeWidth="3" />
      <path d={linePath(project, { x: 0, y: 0, z: 0 }, { x: 0, y: 1.2, z: 0 })} stroke="#94a3b8" strokeWidth="3" />
      <path d={linePath(project, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })} stroke="#94a3b8" strokeWidth="3" />
    </g>
  )
}

function FrameControls({
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

function EmptyPoseScene({ title, message }) {
  const project = createPoseProjector()

  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-[#121212]">
      <svg
        viewBox="0 0 1000 620"
        className="block h-[320px] w-full sm:h-[420px]"
        role="img"
        aria-label={title}
      >
        <defs>
          <radialGradient id="emptyPose3dGlow" cx="50%" cy="50%" r="72%">
            <stop offset="0%" stopColor="#242832" />
            <stop offset="72%" stopColor="#161616" />
            <stop offset="100%" stopColor="#101010" />
          </radialGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#emptyPose3dGlow)" />
        <PoseGrid project={project} />
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

export default function Pose3DPanel({
  objects = [],
  frames = [],
  fps = null,
  mediaType = 'image',
}) {
  const safeFrames = Array.isArray(frames) ? frames : []
  const isVideo = mediaType === 'video' || safeFrames.length > 1
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [lastPoseSnapshot, setLastPoseSnapshot] = useState(null)
  const maxFrameIndex = Math.max(safeFrames.length - 1, 0)
  const selectedFrame = safeFrames[clamp(frameIndex, 0, maxFrameIndex)] ?? null
  const frameObjects = isVideo
    ? (Array.isArray(selectedFrame?.objects) ? selectedFrame.objects : [])
    : objects
  const poseObjects = useMemo(() => getPoseObjects(frameObjects).slice(0, 3), [frameObjects])
  const project = createPoseProjector()
  const frameTimestamp = selectedFrame?.timestamp ?? (fps ? frameIndex / fps : 0)
  const playbackFps = clamp(toNumber(fps, DEFAULT_VIDEO_FPS), 1, 12)
  const holdMissingFrames = Math.max(2, Math.round(toNumber(fps, DEFAULT_VIDEO_FPS) * MISSING_FRAME_HOLD_SECONDS))
  const missingFrameGap = lastPoseSnapshot ? frameIndex - lastPoseSnapshot.frameIndex : Number.POSITIVE_INFINITY
  const shouldHoldLastPose = Boolean(
    isVideo
      && !poseObjects.length
      && lastPoseSnapshot?.objects?.length
      && missingFrameGap > 0
      && missingFrameGap <= holdMissingFrames
  )
  const renderPoseObjects = shouldHoldLastPose ? lastPoseSnapshot.objects : poseObjects

  useEffect(() => {
    if (!isVideo || !poseObjects.length) return

    setLastPoseSnapshot({
      frameIndex,
      timestamp: frameTimestamp,
      objects: poseObjects,
    })
  }, [frameIndex, frameTimestamp, isVideo, poseObjects])

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

  if (!renderPoseObjects.length) {
    const hasObjectsInFrame = frameObjects.length > 0

    return (
      <div className="space-y-3">
        {isVideo && (
          <FrameControls
            frameIndex={frameIndex}
            maxFrameIndex={maxFrameIndex}
            playing={playing}
            timestamp={frameTimestamp}
            onFrameIndexChange={setFrameIndex}
            onPlayingChange={setPlaying}
          />
        )}
        <EmptyPoseScene
          title={hasObjectsInFrame ? 'Chưa có dáng người ở khung này' : 'Không có người ở thời điểm này'}
          message={
            hasObjectsInFrame
              ? 'Khung này có vật thể nhưng chưa đủ điểm dáng người để hiển thị.'
              : 'Không phát hiện người phù hợp ở thời điểm này.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isVideo && (
        <FrameControls
          frameIndex={frameIndex}
          maxFrameIndex={maxFrameIndex}
          playing={playing}
          timestamp={frameTimestamp}
          onFrameIndexChange={setFrameIndex}
          onPlayingChange={setPlaying}
        />
      )}

      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-[#121212]">
        <div className="absolute right-3 top-3 z-10 rounded border border-white/10 bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm">
          {renderPoseObjects.length} dáng người
        </div>
        {shouldHoldLastPose && (
          <div className="absolute left-3 top-3 z-10 rounded border border-blue-300/40 bg-blue-950/80 px-3 py-1.5 text-xs font-medium text-blue-100 shadow-sm">
            Đang giữ khung {lastPoseSnapshot.frameIndex + 1}
          </div>
        )}
        <svg
          viewBox="0 0 1000 620"
          className="block h-[320px] w-full sm:h-[420px]"
          role="img"
          aria-label="Dáng người 3D"
        >
          <defs>
            <radialGradient id="pose3dGlow" cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#242832" />
              <stop offset="72%" stopColor="#161616" />
              <stop offset="100%" stopColor="#101010" />
            </radialGradient>
          </defs>
          <rect width="1000" height="620" fill="url(#pose3dGlow)" />
          <PoseGrid project={project} />
          {renderPoseObjects.map((obj, index) => (
            <PoseSkeleton key={`${obj.id ?? index}-${obj.track_id ?? 'none'}`} obj={obj} index={index} project={project} />
          ))}
        </svg>
      </div>
    </div>
  )
}
