import { useRef, useState } from 'react'
import Button from '../common/Button.jsx'
import { isImageFile, isVideoFile, formatFileSize } from '../../utils/fileUtils.js'

export default function UploadPanel({ selectedFile, previewUrl, fileType, onFileSelect, onClearFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    if (!isImageFile(file) && !isVideoFile(file)) return
    onFileSelect && onFileSelect(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleChange = (e) => handleFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  return (
    <div className="flex flex-col h-full space-y-4">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 px-4 cursor-pointer transition-all duration-150 h-[140px] ${
            dragging
              ? 'border-neutral-400 bg-neutral-50'
              : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-neutral-800">
              Chọn 1 ảnh hoặc 1 video để nhận diện
            </p>
            <p className="text-xs text-neutral-400">
              Hỗ trợ: JPG, PNG, MP4, AVI, MOV
            </p>
          </div>
          <div className="mt-2">
            <Button type="button" variant="secondary" size="sm">
              Chọn file
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden flex flex-col">
          {/* Expanded Preview Thumbnail */}
          <div className="w-full aspect-video max-h-[180px] sm:max-h-[220px] bg-neutral-100 flex items-center justify-center border-b border-neutral-200 relative">
            {fileType === 'image' && (
              <img 
                src={previewUrl} 
                alt="Xem trước file" 
                className="w-full h-full object-contain"
              />
            )}
            {fileType === 'video' && (
              <video 
                src={previewUrl} 
                className="w-full h-full object-contain bg-black"
                controls
              />
            )}
          </div>
          
          {/* File Info */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-500 shrink-0">
                {fileType === 'image' ? 'IMG' : 'VID'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-800 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-xs text-neutral-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
                className="px-2 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors"
              >
                Đổi file
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearFile && onClearFile()
                }}
                className="px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
    </div>
  )
}
