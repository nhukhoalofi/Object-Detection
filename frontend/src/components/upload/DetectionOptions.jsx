import { useState } from 'react'
import Button from '../common/Button.jsx'
import ToggleSwitch from '../common/ToggleSwitch.jsx'

const DEFAULT_OPTIONS = {
  confidence: 0.25,
  iou: 0.45,
  enable_tracking: true,
  enable_3d: false,
  enable_pose: false,
}

export default function DetectionOptions({ onStart, loading = false, fileType = null }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS)

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
        <div className="space-y-4 pt-1">
          <div className="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">
            Độ nhạy nhận diện
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-800">Mức tin cậy</label>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {(options.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.99"
              step="0.01"
              value={options.confidence}
              onChange={(e) => set('confidence', parseFloat(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-800">Độ lọc trùng lặp</label>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {(options.iou * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.99"
              step="0.01"
              value={options.iou}
              onChange={(e) => set('iou', parseFloat(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">
            Tùy chọn hiển thị
          </div>
          <div className="grid grid-cols-1 gap-y-3 gap-x-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${!isVideo ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Theo dõi chuyển động
                </span>
                {!isVideo && <span className="text-[11px] text-neutral-400 mt-0.5">Dành cho video</span>}
              </div>
              <ToggleSwitch
                checked={options.enable_tracking && isVideo}
                onChange={(v) => set('enable_tracking', v)}
                disabled={!isVideo}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-800">
                  Không gian 3D
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5">Xem vị trí vật thể</span>
              </div>
              <ToggleSwitch
                checked={options.enable_3d}
                onChange={(v) => set('enable_3d', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-800">
                  Dáng người
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5">Khi có người trong ảnh</span>
              </div>
              <ToggleSwitch
                checked={options.enable_pose}
                onChange={(v) => set('enable_pose', v)}
              />
            </div>
          </div>
        </div>
      </div>

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
