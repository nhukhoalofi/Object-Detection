import { useState, useEffect } from 'react'
import Button from '../common/Button.jsx'
import ToggleSwitch from '../common/ToggleSwitch.jsx'
import { modelApi } from '../../services/modelApi.js'

const DEFAULT_OPTIONS = {
  model_id: '',
  confidence: 0.25,
  iou: 0.45,
  enable_tracking: true,
  enable_3d: false,
  enable_pose: false,
}

export default function DetectionOptions({ onStart, loading = false, fileType = null }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(true)

  useEffect(() => {
    modelApi.getModels()
      .then(res => {
        const data = res?.data !== undefined ? res.data : res
        if (Array.isArray(data)) {
          setModels(data)
          if (data.length > 0) {
            const firstVal = typeof data[0] === 'object' ? data[0].id : data[0]
            setOptions(prev => ({ ...prev, model_id: firstVal }))
          }
        }
      })
      .catch(err => console.error('Lỗi khi tải models:', err))
      .finally(() => setLoadingModels(false))
  }, [])

  const set = (key, value) => setOptions((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onStart && onStart(options)
  }

  const isVideo = fileType === 'video'
  const hasFile = fileType !== null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
      <div className="space-y-5 mb-4">
        
        {/* 1. Model */}
        <div>
          <label className="block text-sm font-medium text-neutral-800 mb-1.5">
            Mô hình YOLO
          </label>
          <select 
            value={options.model_id}
            onChange={(e) => set('model_id', e.target.value)}
            disabled={loadingModels}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800 font-medium disabled:opacity-50"
          >
            {loadingModels ? (
              <option value="">Đang tải...</option>
            ) : models.length > 0 ? (
              models.map((m, i) => {
                const val = typeof m === 'object' ? m.id : m
                const label = typeof m === 'object' ? (m.model_name || m.name || val) : m
                return <option key={i} value={val}>{label}</option>
              })
            ) : (
              <option value="">Mặc định từ Backend</option>
            )}
          </select>
        </div>
        
        {/* 2 & 3. Sliders */}
        <div className="space-y-4 pt-1">
          <div className="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">
            Ngưỡng nhận diện
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-800">Ngưỡng tin cậy</label>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {(options.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1" max="0.99" step="0.01"
              value={options.confidence}
              onChange={(e) => set('confidence', parseFloat(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-800">Ngưỡng IoU</label>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {(options.iou * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1" max="0.99" step="0.01"
              value={options.iou}
              onChange={(e) => set('iou', parseFloat(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </div>
        </div>

        {/* 4. Switches */}
        <div className="space-y-3 pt-1">
          <div className="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">
            Tùy chọn xử lý
          </div>
          <div className="grid grid-cols-1 gap-y-3 gap-x-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${!isVideo ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Bật tracking
                </span>
                {!isVideo && <span className="text-[11px] text-neutral-400 mt-0.5">Chỉ hỗ trợ video</span>}
              </div>
              <ToggleSwitch
                checked={options.enable_tracking && isVideo}
                onChange={(v) => set('enable_tracking', v)}
                disabled={!isVideo}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-400">
                  Bật bounding box 3D
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Đang chờ API Backend</span>
              </div>
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-400">
                  Bật pose estimation
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Đang chờ API Backend</span>
              </div>
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Footer Action */}
      <div className="mt-auto border-t border-neutral-100 pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !hasFile}
          className="w-full text-base font-semibold justify-center h-12"
          title={!hasFile ? 'Vui lòng chọn file trước' : ''}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 mr-2 rounded-full border-2 border-neutral-400 border-t-white animate-spin" />
              Đang nhận diện...
            </>
          ) : (
            'Bắt đầu nhận diện'
          )}
        </Button>
      </div>
    </form>
  )
}
