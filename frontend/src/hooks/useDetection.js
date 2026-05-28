import { useState, useCallback } from 'react'
import { detectionApi } from '../services/detectionApi.js'
import { normalizeApiError } from '../services/apiClient.js'
import { isImageFile, isVideoFile } from '../utils/fileUtils.js'

export function useDetection() {
  const [status, setStatus] = useState('idle') // idle | loading | completed | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const runDetection = useCallback(async (file, options) => {
    if (!file) {
      return
    }

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      console.log('selected file before API:', file)

      let actualFile = file
      if (file && !(file instanceof File || file instanceof Blob)) {
        if (file.file instanceof File || file.file instanceof Blob) {
          actualFile = file.file
        } else if (file.rawFile instanceof File || file.rawFile instanceof Blob) {
          actualFile = file.rawFile
        } else {
          console.error('Invalid file object provided to runDetection:', file)
          throw new Error('Dữ liệu file không hợp lệ. Vui lòng chọn lại file.')
        }
      }

      let res
      if (isImageFile(actualFile)) {
        res = await detectionApi.detectImage({
          file: actualFile,
          modelId: options.model_id,
          confidence: options.confidence,
          iou: options.iou,
          enable3d: options.enable_3d,
          enablePose: options.enable_pose
        })
      } else if (isVideoFile(actualFile)) {
        res = await detectionApi.detectVideo({
          file: actualFile,
          modelId: options.model_id,
          confidence: options.confidence,
          iou: options.iou,
          enableTracking: options.enable_tracking,
          enable3d: options.enable_3d,
          enablePose: options.enable_pose
        })
      } else {
        throw new Error('Định dạng file không được hỗ trợ.')
      }

      console.log('[DetectTrack] Upload response raw:', res)
      console.log('[DetectTrack] Upload response:', res)

      // Handle both { success, data } and direct data responses
      const responseData = res?.data !== undefined ? res.data : res

      if (res?.success === false || responseData?.success === false) {
        const normalized = normalizeApiError(responseData)
        throw new Error(normalized.message)
      }

      setResult(responseData)

      const isVideoJob = isVideoFile(actualFile)
      if (isVideoJob && responseData?.job_id) {
        console.log('[DetectTrack] Upload video response:', responseData)
        setStatus('processing')
      } else {
        console.log('[DetectTrack] Upload image response:', responseData)
        setStatus('completed')
      }
    } catch (err) {
      console.error('[DetectTrack] Backend error:', err)
      const normalized = normalizeApiError(err)
      setError(normalized.message || 'Lỗi không xác định')
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, runDetection, reset }
}
