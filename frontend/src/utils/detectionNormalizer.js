function toStaticUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = import.meta.env.VITE_STATIC_BASE_URL || ''
  const separator = url.startsWith('/') ? '' : '/'
  return `${base}${separator}${url}`
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function normalizeDetectionResult(response) {
  const raw = response?.data?.data ?? response?.data ?? response ?? null
  const frames = Array.isArray(raw?.frames)
    ? raw.frames
    : raw?.frame
      ? [raw.frame]
      : []

  const objects = frames.flatMap((frame) => (Array.isArray(frame?.objects) ? frame.objects : []))
  const confidences = objects
    .map((obj) => toNumber(obj?.confidence))
    .filter((value) => value !== null)

  const totalObjects = objects.length
  const avgConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0

  const resultVideoUrl = raw?.result_video_url ? toStaticUrl(raw.result_video_url) : null
  const resultImageUrlRaw = raw?.result_image_url ?? raw?.file_url ?? raw?.result_image
  const resultImageUrl = resultImageUrlRaw ? toStaticUrl(resultImageUrlRaw) : null

  const trackIds = [...new Set(objects
    .map((obj) => obj?.track_id)
    .filter((value) => value !== null && value !== undefined))]

  return {
    jobId: raw?.job_id ?? raw?.jobId ?? null,
    mediaType: raw?.media_type ?? (resultVideoUrl ? 'video' : 'image'),
    status: raw?.status ?? raw?.job_status ?? raw?.state ?? null,
    progress: typeof raw?.progress === 'number' ? raw.progress : null,
    fps: typeof raw?.fps === 'number' ? raw.fps : null,
    modelVersion: raw?.model_version ?? raw?.modelVersion ?? null,
    processingTimeMs: raw?.processing_time_ms ?? raw?.processingTimeMs ?? null,
    frames,
    objects,
    totalObjects,
    avgConfidence,
    trackIds,
    resultImageUrl,
    resultVideoUrl,
    raw,
  }
}