import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

const apiClient = axios.create({
  baseURL: BASE_URL,
})

function formatValidationErrors(detail) {
  return detail
    .map((item) => {
      if (!item) return 'Lỗi không xác định'
      if (typeof item === 'string') return item
      const loc = Array.isArray(item.loc) ? item.loc.join('.') : item.loc
      const msg = item.msg || item.message || JSON.stringify(item)
      return loc ? `${loc}: ${msg}` : msg
    })
    .join('\n')
}

function normalizeDetailObject(detail) {
  if (!detail || typeof detail !== 'object') return null

  if (typeof detail.message === 'string') return detail.message
  if (typeof detail.error === 'string') return detail.error

  if (detail.error && typeof detail.error === 'object') {
    if (typeof detail.error.details === 'string') return detail.error.details
    if (Array.isArray(detail.error.details)) return detail.error.details.join('\n')
    if (typeof detail.error.message === 'string') return detail.error.message
  }

  return JSON.stringify(detail)
}

export function normalizeApiError(error) {
  const responseData = error?.response?.data ?? error?.data ?? error ?? null
  const status = error?.response?.status

  const detail = responseData?.detail
  let message = null

  if (Array.isArray(detail)) {
    message = formatValidationErrors(detail)
  } else if (typeof detail === 'string') {
    message = detail
  } else if (detail && typeof detail === 'object') {
    message = normalizeDetailObject(detail)
  }

  if (!message && typeof responseData?.message === 'string') {
    message = responseData.message
  }
  if (!message && typeof responseData?.error === 'string') {
    message = responseData.error
  }
  if (!message && responseData?.error && typeof responseData.error === 'object') {
    message = normalizeDetailObject(responseData.error)
  }

  if (!message && typeof error?.message === 'string') {
    message = error.message
  }

  if (typeof message === 'string' && message.includes('DETECTION_ERROR')) {
    if (message.includes('file does not exist')) {
      message = 'Backend xử lý ảnh thất bại: file không tồn tại sau khi upload.'
    }
  }

  if (!message) {
    message = 'Lỗi không xác định'
  }

  return { message, status, data: responseData }
}

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const normalized = normalizeApiError(error)
    if (error.response?.data?.detail) {
      console.error('[DetectTrack] Backend error:', error.response.data.detail)
    }
    return Promise.reject(Object.assign(new Error(normalized.message), { normalized }))
  }
)

export default apiClient
