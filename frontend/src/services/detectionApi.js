import apiClient from './apiClient.js'

function getActualFile(input) {
  const actualFile = input?.file || input?.rawFile || input

  if (!(actualFile instanceof File) && !(actualFile instanceof Blob)) {
    console.error('Invalid file passed to detection API:', input)
    throw new Error('File upload không hợp lệ: chưa truyền đúng File/Blob.')
  }

  return actualFile
}

function debugFormData(formData) {
  console.log('--- FormData Payload ---')
  for (const [key, value] of formData.entries()) {
    console.log(key, value)
  }
  console.log('------------------------')
}

function toNumberString(value, fallback) {
  const num = Number(value)
  if (Number.isFinite(num)) {
    return String(num)
  }
  return String(fallback)
}

export const detectionApi = {
  detectImage({
    file,
    confidence = 0.25,
    iou = 0.45,
    enable3d = false,
    enablePose = false,
  }) {
    const actualFile = getActualFile(file)

    const formData = new FormData()
    formData.append('file', actualFile)
    formData.append('confidence', toNumberString(confidence, 0.25))
    formData.append('iou', toNumberString(iou, 0.45))
    formData.append('enable_3d', String(Boolean(enable3d)))
    formData.append('enable_pose', String(Boolean(enablePose)))

    debugFormData(formData)

    return apiClient.post('/detections/image', formData)
  },

  detectVideo({
    file,
    confidence = 0.25,
    iou = 0.45,
    enableTracking = true,
    enable3d = false,
    enablePose = false,
  }) {
    const actualFile = getActualFile(file)

    const formData = new FormData()
    formData.append('file', actualFile)
    formData.append('confidence', toNumberString(confidence, 0.25))
    formData.append('iou', toNumberString(iou, 0.45))
    formData.append('enable_tracking', String(Boolean(enableTracking)))
    formData.append('enable_3d', String(Boolean(enable3d)))
    formData.append('enable_pose', String(Boolean(enablePose)))

    debugFormData(formData)

    return apiClient.post('/detections/video', formData)
  },
}
