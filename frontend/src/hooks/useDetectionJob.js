import { useState, useEffect, useCallback, useRef } from 'react'
import { jobApi } from '../services/jobApi.js'
import { normalizeApiError } from '../services/apiClient.js'

export function useDetectionJob(jobId) {
  const [jobStatus, setJobStatus] = useState(null)
  const [jobResult, setJobResult] = useState(null)
  const [polling, setPolling] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)
  const [hasProgress, setHasProgress] = useState(false)
  const intervalRef = useRef(null)
  const jobIdRef = useRef(null)
  const resultFetchedRef = useRef(false)
  const jobResultRef = useRef(null)

  useEffect(() => {
    jobResultRef.current = jobResult
  }, [jobResult])

  const resolveJobError = useCallback((data) => {
    if (typeof data?.error_message === 'string' && data.error_message.trim()) {
      return data.error_message
    }
    const normalized = normalizeApiError({ response: { data } })
    return normalized.message
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setPolling(false)
  }, [])

  const fetchResultOnce = useCallback(async (id) => {
    if (resultFetchedRef.current || jobResultRef.current) return
    resultFetchedRef.current = true
    const resultRes = await jobApi.getJobResult(id)
    const resultData = resultRes?.data !== undefined ? resultRes.data : resultRes
    console.log('[DetectTrack] Job result response:', resultData)
    setJobResult(resultData)
  }, [])

  const pollJob = useCallback(
    async (id) => {
      try {
        const res = await jobApi.getJobStatus(id)
        const data = res?.data !== undefined ? res.data : res
        console.log('[DetectTrack] Job polling response:', data)
        setJobStatus(data)

        if (typeof data?.progress === 'number') {
          const nextProgress = Math.min(100, Math.max(0, data.progress))
          setProgress(nextProgress)
          setHasProgress(true)
        }

        const jobState = String(data?.status || '').toLowerCase()

        if (jobState === 'completed') {
          setProgress(100)
          setHasProgress(true)
          await fetchResultOnce(id)
          setStatus('completed')
          stopPolling()
          return
        }

        if (jobState === 'failed' || jobState === 'cancelled') {
          setStatus('error')
          setError(resolveJobError(data))
          console.error('[DetectTrack] Backend error:', data)
          stopPolling()
          return
        }

        if (jobState === 'pending' || jobState === 'processing' || jobState === 'running') {
          setStatus('processing')
        } else {
          setStatus('processing')
        }
      } catch (err) {
        const normalized = normalizeApiError(err)
        setStatus('error')
        setError(normalized.message)
        console.error('[DetectTrack] Backend error:', err)
        stopPolling()
      }
    },
    [fetchResultOnce, resolveJobError, stopPolling]
  )

  const startPolling = useCallback(
    (id) => {
      if (!id || intervalRef.current || jobResultRef.current) return null
      if (jobIdRef.current && jobIdRef.current !== id) {
        stopPolling()
      }
      jobIdRef.current = id
      setPolling(true)
      setStatus('processing')
      setError(null)
      setProgress(null)
      setHasProgress(false)

      pollJob(id)
      const intervalId = setInterval(() => {
        pollJob(id)
      }, 1500)
      intervalRef.current = intervalId
      return intervalId
    },
    [pollJob, stopPolling]
  )

  useEffect(() => {
    if (jobId) {
      if (jobIdRef.current && jobIdRef.current !== jobId) {
        stopPolling()
        setJobStatus(null)
        setJobResult(null)
        setStatus('idle')
        setError(null)
        setProgress(0)
        resultFetchedRef.current = false
        jobResultRef.current = null
      }
      jobIdRef.current = jobId
      const intervalId = startPolling(jobId)
      return () => {
        if (intervalId) {
          clearInterval(intervalId)
        }
        stopPolling()
      }
    } else {
      setJobStatus(null)
      setJobResult(null)
      setStatus('idle')
      setError(null)
      setProgress(null)
      setHasProgress(false)
      resultFetchedRef.current = false
      jobIdRef.current = null
      stopPolling()
    }
    return () => stopPolling()
  }, [jobId, startPolling, stopPolling])

  return { jobStatus, jobResult, polling, status, error, progress, hasProgress, stopPolling }
}
