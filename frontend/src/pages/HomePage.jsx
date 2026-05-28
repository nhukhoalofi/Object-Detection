import { useState, useRef, useEffect } from 'react'
import Card from '../components/common/Card.jsx'
import Loading from '../components/common/Loading.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Button from '../components/common/Button.jsx'
import ResultTabs from '../components/common/ResultTabs.jsx'
import StepBar from '../components/layout/StepBar.jsx'
import UploadPanel from '../components/upload/UploadPanel.jsx'
import DetectionOptions from '../components/upload/DetectionOptions.jsx'
import DetectionCanvas2D from '../components/detection2d/DetectionCanvas2D.jsx'
import DetectionTable from '../components/result/DetectionTable.jsx'
import JsonOutputPanel from '../components/result/JsonOutputPanel.jsx'
import ThreeDPanel from '../components/result/ThreeDPanel.jsx'
import PoseEstimationPanel from '../components/result/PoseEstimationPanel.jsx'
import { useDetection } from '../hooks/useDetection.js'
import { useDetectionJob } from '../hooks/useDetectionJob.js'
import { formatConfidence, formatMs } from '../utils/formatUtils.js'
import { healthApi } from '../services/healthApi.js'
import { normalizeDetectionResult } from '../utils/detectionNormalizer.js'

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [backendHealth, setBackendHealth] = useState('checking')
  const [videoError, setVideoError] = useState(null)
  const resultRef = useRef(null)

  useEffect(() => {
    healthApi.check()
      .then((res) => {
        if (res?.success === true && res?.data?.status === 'ok') {
          setBackendHealth('online')
        } else {
          setBackendHealth('offline')
        }
      })
      .catch(() => setBackendHealth('offline'))
  }, [])

  const { status, result, error, runDetection, reset } = useDetection()

  const normalizedImage = normalizeDetectionResult(result)
  const jobId = fileType === 'video' ? normalizedImage.jobId : null
  const isVideoJob = Boolean(jobId && selectedFile && fileType === 'video')
  const { jobStatus, jobResult, error: jobError, progress: jobProgress, hasProgress, status: jobState } = useDetectionJob(jobId)

  const normalizedVideo = normalizeDetectionResult(jobResult)
  const videoReady = isVideoJob && jobState === 'completed'
  const displayResult = videoReady ? normalizedVideo : (!isVideoJob ? normalizedImage : null)
  const displayObjects = Array.isArray(displayResult?.objects) ? displayResult.objects : []

  const imageFrame = normalizedImage.frames?.[0] ?? null
  const videoFrame = normalizedVideo.frames?.[0] ?? null
  const imageWidth = (videoReady ? videoFrame : imageFrame)?.image_width || 0
  const imageHeight = (videoReady ? videoFrame : imageFrame)?.image_height || 0

  const mediaUrl = videoReady
    ? (normalizedVideo.resultVideoUrl || normalizedVideo.resultImageUrl)
    : normalizedImage.resultImageUrl
  const backendVideoUrl = displayResult?.resultVideoUrl || null
  const debugVideoUrl = backendVideoUrl ? `${backendVideoUrl}?t=${Date.now()}` : null
  const fps = displayResult?.fps ?? displayResult?.raw?.fps ?? null

  const downloadVideoUrl = displayResult?.resultVideoUrl || null
  const downloadImageUrl = displayResult?.resultImageUrl || null
  const hasDownload = Boolean(downloadVideoUrl || downloadImageUrl)

  const jsonData = videoReady
    ? (normalizedVideo.raw ?? normalizedVideo)
    : (isVideoJob ? (jobStatus ?? normalizedImage.raw ?? normalizedImage) : (normalizedImage.raw ?? normalizedImage))

  useEffect(() => {
    if (displayResult) {
      console.log('[DetectTrack] Normalized result:', displayResult)
      console.log('[DetectTrack] Has backend result video:', Boolean(displayResult.resultVideoUrl))
      console.log('[DetectTrack] Total objects:', displayResult.objects?.length ?? 0)
      console.log('[DetectTrack] resultVideoUrl:', displayResult.resultVideoUrl)
    }
  }, [displayResult])

  let currentStep = 1
  if (selectedFile) currentStep = 2
  if (status === 'loading' || status === 'processing' || jobState === 'processing') currentStep = 3
  if (!isVideoJob && status === 'completed') currentStep = 4
  if (isVideoJob && jobState === 'completed') currentStep = 4
  const hasResult = currentStep === 4

  useEffect(() => {
    if (hasResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hasResult])

  const handleStart = (options) => runDetection(selectedFile, options)
  
  const handleFileSelect = (f) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    
    setSelectedFile(f)
    if (f) {
      setPreviewUrl(URL.createObjectURL(f))
      setFileType(f.type.startsWith('video/') ? 'video' : 'image')
    } else {
      setPreviewUrl(null)
      setFileType(null)
    }
    reset()
  }

  const handleClearFile = () => handleFileSelect(null)

  useEffect(() => {
    setVideoError(null)
  }, [backendVideoUrl])

  const processingTime = displayResult?.processingTimeMs ?? displayResult?.raw?.processing_time_ms ?? 0

  // Downloads
  const handleDownloadMedia = () => {
    const downloadUrl = downloadVideoUrl || downloadImageUrl || previewUrl
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `detecttrack-annotated-${fileType === 'video' ? 'video.mp4' : 'image.png'}`
    a.target = '_blank'
    a.click()
  }
  const tabs = [
    {
      label: 'Danh sách vật thể',
      content: (
        <Card title="Danh sách vật thể">
          <DetectionTable objects={displayObjects} />
        </Card>
      )
    },
    {
      label: 'JSON kết quả',
      content: (
        <Card className="px-0 py-0 border-none shadow-none">
          <JsonOutputPanel data={jsonData} />
        </Card>
      )
    },
    {
      label: 'Pose Estimation',
      content: (
        <Card className="px-0 py-0 border-none shadow-none">
          <PoseEstimationPanel objects={displayObjects} />
        </Card>
      )
    },
    {
      label: 'Trực quan hóa 3D',
      content: (
        <Card title="Trực quan hóa 3D">
          <ThreeDPanel objects={displayObjects} />
        </Card>
      )
    }
  ]

  return (
    <>
      <div className="flex flex-col min-h-full">
        <StepBar currentStep={currentStep} />
        
        <div className="flex-1 px-6 pt-5 pb-8 max-w-[1440px] mx-auto w-full space-y-6">
          
          {/* ── 3. Control Panel (Ngang) ── */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col lg:flex-row">
              {/* Cột trái: Upload (40%) */}
              <div className="w-full lg:w-[40%] p-5 border-b lg:border-b-0 lg:border-r border-neutral-200 bg-neutral-50/50 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[18px] sm:text-[20px] font-bold text-neutral-900 border-l-[4px] border-neutral-900 pl-3 leading-none">Tải ảnh/video</h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${backendHealth === 'online' ? 'bg-green-500' : backendHealth === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                    <span className="text-xs text-neutral-500">{backendHealth === 'online' ? 'Backend Online' : backendHealth === 'offline' ? 'Backend Offline' : 'Đang kiểm tra...'}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <UploadPanel 
                    selectedFile={selectedFile}
                    previewUrl={previewUrl}
                    fileType={fileType}
                    onFileSelect={handleFileSelect}
                    onClearFile={handleClearFile}
                  />
                </div>
              </div>

              {/* Cột phải: Cấu hình (60%) */}
              <div className="w-full lg:w-[60%] flex flex-col">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-neutral-900 border-l-[4px] border-neutral-900 pl-3 leading-none">Cấu hình nhận diện</h2>
                    <Button variant="secondary" size="sm" onClick={handleClearFile} className="h-9">
                      <svg className="w-4 h-4 mr-1.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset tất cả
                    </Button>
                  </div>
                  <div className="flex-1">
                      <DetectionOptions 
                        onStart={handleStart} 
                        loading={status === 'loading'} 
                        fileType={fileType} 
                      />
                      {(error || jobError) && (
                        <div className="mt-3">
                          <ErrorMessage message={error || jobError} />
                        </div>
                      )}
                  </div>
                </div>
              </div>
          </div>

          {/* ── 4. Main Result Area (70/30) ── */}
          <div ref={resultRef} className="grid grid-cols-1 lg:grid-cols-12 gap-5 scroll-mt-6">
            
            {/* Cột trái 70% */}
            <div className="lg:col-span-8 flex flex-col">
              <Card title="Kết quả nhận diện 2D" className="flex-1">
                {!selectedFile ? (
                  <div className="h-[520px] flex flex-col items-center justify-center bg-neutral-50 rounded-lg border border-neutral-200 border-dashed">
                    <p className="text-neutral-500 font-medium">Vui lòng tải ảnh/video để bắt đầu</p>
                  </div>
                ) : status === 'loading' && !isVideoJob ? (
                  <div className="h-[520px] flex flex-col items-center justify-center bg-neutral-900 rounded-lg border border-neutral-200">
                    <Loading text="Đang chạy mô hình YOLO..." />
                  </div>
                ) : fileType === 'video' && backendVideoUrl ? (
                  <div className="space-y-3">
                    <video
                      key={debugVideoUrl}
                      src={debugVideoUrl}
                      controls
                      preload="auto"
                      className="w-full h-[520px] rounded-lg border border-neutral-200 bg-neutral-900 object-contain"
                      onLoadedMetadata={(e) => {
                        const el = e.currentTarget
                        console.log('[DetectTrack] video metadata', {
                          duration: el.duration,
                          videoWidth: el.videoWidth,
                          videoHeight: el.videoHeight,
                          src: el.currentSrc,
                        })
                      }}
                      onCanPlay={() => console.log('[DetectTrack] video can play')}
                      onError={(e) => {
                        console.error('[DetectTrack] video error', e)
                        setVideoError('Video output không phát được trên trình duyệt, cần backend xuất H.264/yuv420p.')
                      }}
                    />
                    {videoError && (
                      <ErrorMessage message={videoError} />
                    )}
                  </div>
                ) : (
                  <DetectionCanvas2D
                    previewUrl={mediaUrl || previewUrl}
                    fileType={fileType}
                    objects={displayObjects}
                    frames={displayResult?.frames}
                    fps={fps}
                    imageWidth={imageWidth}
                    imageHeight={imageHeight}
                  />
                )}
              </Card>
            </div>

            {/* Cột phải 30% */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <Card title="Thống kê nhanh">
                <div className="space-y-4">
                  {/* Status line */}
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                    <span className="text-sm text-neutral-500">Trạng thái xử lý</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      hasResult ? 'bg-neutral-900 text-white' : 
                      status === 'loading' ? 'bg-neutral-200 text-neutral-700 animate-pulse' : 
                      'bg-neutral-100 text-neutral-500'
                    }`}>
                      {hasResult
                        ? 'Hoàn thành'
                        : isVideoJob
                          ? (jobState === 'processing' ? 'Đang xử lý' : 'Đang chờ')
                          : (status === 'loading' || status === 'processing' ? 'Đang xử lý' : 'Đang chờ')}
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500">Tổng vật thể</p>
                      <p className="text-lg font-bold text-neutral-900 font-mono">{hasResult ? displayResult?.totalObjects ?? 0 : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Độ tin cậy TB</p>
                      <p className="text-lg font-bold text-neutral-900 font-mono">{hasResult ? formatConfidence(displayResult?.avgConfidence) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Thời gian</p>
                      <p className="text-lg font-bold text-neutral-900 font-mono">{hasResult ? formatMs(processingTime) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Track ID</p>
                      <p className="text-lg font-bold text-neutral-900 font-mono">
                        {hasResult ? (displayResult?.trackIds?.length ? displayResult.trackIds.join(', ') : '-') : '-'}
                      </p>
                    </div>
                  </div>

                  {isVideoJob && jobStatus && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-500">Tiến độ video</span>
                        <span className="font-mono">
                          {hasProgress ? `${jobProgress}%` : 'Đang xử lý'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        {hasProgress ? (
                          <div className="h-full bg-neutral-900 transition-all duration-300" style={{ width: `${jobProgress}%` }} />
                        ) : (
                          <div className="h-full bg-neutral-300 animate-pulse" style={{ width: '100%' }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Tải xuống kết quả" className="flex-1">
                <div className="flex flex-col gap-3">
                  <Button 
                    variant="primary" 
                    disabled={!hasDownload} 
                    onClick={handleDownloadMedia}
                    className="justify-center"
                  >
                    Tải xuống {downloadVideoUrl ? 'video' : 'ảnh'} kết quả
                  </Button>
                  
                  {!hasDownload && (
                    <p className="text-xs text-center text-neutral-400 mt-2">
                      Chưa có kết quả để tải xuống
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* ── 5. Bottom Result Tabs ── */}
          <div className="pt-2">
            <ResultTabs tabs={tabs} />
          </div>

        </div>
      </div>
    </>
  )
}
