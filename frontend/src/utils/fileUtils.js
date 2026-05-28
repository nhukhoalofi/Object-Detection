export function isImageFile(file) {
  if (!file) return false
  return file.type.startsWith('image/')
}

export function isVideoFile(file) {
  if (!file) return false
  return file.type.startsWith('video/')
}

export function getFileURL(file) {
  if (!file) return null
  return URL.createObjectURL(file)
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
