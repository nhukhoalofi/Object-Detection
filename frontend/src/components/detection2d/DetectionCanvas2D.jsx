import { useEffect, useRef, useState } from 'react'
import BoundingBox2D from './BoundingBox2D.jsx'

const DEFAULT_IMAGE_W = 1280
const DEFAULT_IMAGE_H = 720

export default function DetectionCanvas2D({ previewUrl, fileType, objects = [], frames = [], fps = null, imageWidth, imageHeight }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [display, setDisplay] = useState({ w: 640, h: 360, cx: 0, cy: 0 })
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const lastLoggedFrameRef = useRef(-1)

  const imgW = imageWidth || DEFAULT_IMAGE_W
  const imgH = imageHeight || DEFAULT_IMAGE_H

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = entry.contentRect.width
        const ch = entry.contentRect.height
        
        const imgRatio = imgW / imgH
        const containerRatio = cw / ch
        
        let w = cw
        let h = ch
        
        if (containerRatio > imgRatio) {
          // Pillarbox (empty space on left/right)
          w = ch * imgRatio
        } else {
          // Letterbox (empty space on top/bottom)
          h = cw / imgRatio
        }
        
        setDisplay({
          w,
          h,
          cx: (cw - w) / 2,
          cy: (ch - h) / 2
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [imgW, imgH])

  const scaleX = display.w / imgW
  const scaleY = display.h / imgH

  const isVideo = fileType === 'video'
  const safeFrames = Array.isArray(frames) ? frames : []
  const frameLookup = safeFrames.find((frame) => frame?.frame_index === currentFrameIndex)
  const currentFrameObjects = Array.isArray(frameLookup?.objects) ? frameLookup.objects : []
  const safeObjects = isVideo ? currentFrameObjects : (Array.isArray(objects) ? objects : [])
  const drawableObjects = safeObjects.filter((obj) => obj?.bbox_2d || obj?.bbox)

  useEffect(() => {
    if (!isVideo || !videoRef.current || !fps) return
    const videoEl = videoRef.current

    const handleTimeUpdate = () => {
      const nextIndex = Math.floor(videoEl.currentTime * fps)
      setCurrentFrameIndex((prev) => (prev === nextIndex ? prev : nextIndex))
    }

    videoEl.addEventListener('timeupdate', handleTimeUpdate)
    return () => videoEl.removeEventListener('timeupdate', handleTimeUpdate)
  }, [isVideo, fps])

  useEffect(() => {
    if (!isVideo) return
    if (lastLoggedFrameRef.current !== currentFrameIndex) {
      console.log('[DetectTrack] Current frame index:', currentFrameIndex)
      console.log('[DetectTrack] Current frame objects:', currentFrameObjects)
      lastLoggedFrameRef.current = currentFrameIndex
    }
  }, [isVideo, currentFrameIndex, currentFrameObjects])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] rounded-lg overflow-hidden border border-neutral-200 bg-neutral-900"
    >
      {/* Media */}
      {previewUrl && fileType === 'image' && (
        <img src={previewUrl} alt="Detection" className="absolute inset-0 w-full h-full object-contain" />
      )}
      {previewUrl && fileType === 'video' && (
        <video ref={videoRef} src={previewUrl} className="absolute inset-0 w-full h-full object-contain" controls />
      )}
      
      {!previewUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Subtle grid pattern on dark canvas */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#canvas-grid)" />
          </svg>
          <div className="relative z-10 text-center">
            <p className="text-sm text-neutral-500">Kết quả nhận diện 2D</p>
            <p className="text-xs text-neutral-600 mt-1">Tải file để xem bbox</p>
          </div>
        </div>
      )}

      {/* Bounding boxes container centered over the object-contain image */}
      <div 
        className="absolute"
        style={{ left: display.cx, top: display.cy, width: display.w, height: display.h }}
      >
        {drawableObjects.map((obj, i) => (
          <BoundingBox2D key={`bbox-${i}`} obj={obj} scaleX={scaleX} scaleY={scaleY} />
        ))}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {safeObjects.map((obj, i) => {
            if (!obj.keypoints) return null
            return (
              <g key={`pose-${i}`}>
                {obj.skeleton?.map((pair, j) => {
                  const pt1 = obj.keypoints[pair[0]]
                  const pt2 = obj.keypoints[pair[1]]
                  if (!pt1 || !pt2) return null
                  return (
                    <line 
                      key={`skel-${j}`} 
                      x1={pt1[0] * scaleX} y1={pt1[1] * scaleY} 
                      x2={pt2[0] * scaleX} y2={pt2[1] * scaleY} 
                      stroke="#10b981" strokeWidth={2.5} opacity={0.85} 
                    />
                  )
                })}
                {obj.keypoints.map((pt, j) => (
                  <circle 
                    key={`pt-${j}`} 
                    cx={pt[0] * scaleX} cy={pt[1] * scaleY} 
                    r={3} fill="#ef4444" stroke="#ffffff" strokeWidth={1}
                  />
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      {safeObjects.length > 0 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 border border-white/20 rounded text-xs text-white font-mono z-20">
          {isVideo ? `${safeObjects.length} vật thể` : `${safeObjects.length} vật thể`}
        </div>
      )}
      {previewUrl && safeObjects.length === 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 border border-white/20 rounded text-xs text-white z-20">
          Không có object được phát hiện
        </div>
      )}
    </div>
  )
}
