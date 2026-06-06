import { useState } from 'react'
import Button from '../common/Button.jsx'

export default function JsonOutputPanel({ data }) {
  const [copied, setCopied] = useState(false)
  const json = data ? JSON.stringify(data, null, 2) : null

  const handleCopy = () => {
    if (!json) return
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b border-neutral-100 pb-4">
        <span className="text-[18px] sm:text-[20px] font-bold text-neutral-900 border-l-[4px] border-neutral-900 pl-3 leading-none">Dữ liệu chi tiết</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!data}>
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </Button>
        </div>
      </div>

      {!json ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-neutral-200 rounded-lg bg-neutral-50 text-center space-y-1">
          <p className="text-sm font-medium text-neutral-500">Chưa có dữ liệu chi tiết</p>
          <p className="text-xs text-neutral-400">Vui lòng tải ảnh/video và chạy nhận diện trước</p>
        </div>
      ) : (
        <pre className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-xs sm:text-sm text-neutral-800 font-mono overflow-auto max-h-[400px] leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  )
}
