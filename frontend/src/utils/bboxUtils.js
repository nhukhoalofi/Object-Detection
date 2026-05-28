/**
 * Scale bbox_2d [x1, y1, x2, y2] from original image coords to display coords.
 */
export function scaleBbox(bbox2d, imageWidth, imageHeight, displayWidth, displayHeight) {
  const [x1, y1, x2, y2] = bbox2d
  const scaleX = displayWidth / imageWidth
  const scaleY = displayHeight / imageHeight
  return {
    left: x1 * scaleX,
    top: y1 * scaleY,
    width: (x2 - x1) * scaleX,
    height: (y2 - y1) * scaleY,
  }
}

export function bboxToString(bbox2d) {
  if (!bbox2d) return 'N/A'

  if (Array.isArray(bbox2d)) {
    return bbox2d.map((v) => Number(v).toFixed(1)).join(', ')
  }

  if (typeof bbox2d === 'object') {
    const x1 = bbox2d.x1 ?? bbox2d.x ?? bbox2d.left
    const y1 = bbox2d.y1 ?? bbox2d.y ?? bbox2d.top
    const x2 = bbox2d.x2 ?? bbox2d.right ?? bbox2d.xmax
    const y2 = bbox2d.y2 ?? bbox2d.bottom ?? bbox2d.ymax
    const w = bbox2d.width ?? bbox2d.w
    const h = bbox2d.height ?? bbox2d.h

    if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
      return `x1=${Number(x1).toFixed(1)}, y1=${Number(y1).toFixed(1)}, x2=${Number(x2).toFixed(1)}, y2=${Number(y2).toFixed(1)}`
    }

    if (x1 !== undefined && y1 !== undefined && w !== undefined && h !== undefined) {
      return `x=${Number(x1).toFixed(1)}, y=${Number(y1).toFixed(1)}, w=${Number(w).toFixed(1)}, h=${Number(h).toFixed(1)}`
    }

    return JSON.stringify(bbox2d)
  }

  return String(bbox2d)
}