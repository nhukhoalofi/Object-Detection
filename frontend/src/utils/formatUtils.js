const CLASS_NAMES_VI = {
  person: 'Người',
  bicycle: 'Xe đạp',
  car: 'Ô tô',
}

export function getClassNameVI(className) {
  return CLASS_NAMES_VI[className] || className
}

export function formatConfidence(conf) {
  if (conf === null || conf === undefined) return '-'
  const value = Number(conf)
  if (!Number.isFinite(value)) return '-'
  return `${(value * 100).toFixed(1)}%`
}

export function formatDepth(depth) {
  if (depth === null || depth === undefined) return '-'
  const value = Number(depth)
  if (!Number.isFinite(value)) return '-'
  return `${value.toFixed(1)}m`
}

export function formatMs(ms) {
  if (!ms && ms !== 0) return '-'
  return `${ms}ms`
}

export function formatStatus(status) {
  const map = {
    waiting: 'Đang chờ',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    failed: 'Thất bại',
    tracked: 'Đang theo dõi',
  }
  return map[status] || status
}
