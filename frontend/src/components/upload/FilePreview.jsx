import { useEffect, useState } from 'react'
import { isImageFile, isVideoFile, getFileURL } from '../../utils/fileUtils.js'

export default function FilePreview({ file }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const objectUrl = getFileURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!file) {
    return (
      <div className="w-full h-32 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-center">
        <p className="text-sm text-neutral-400">Chưa có file</p>
      </div>
    )
  }

  if (isImageFile(file) && url) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-neutral-200">
        <img src={url} alt="Preview" className="w-full object-contain max-h-48 bg-neutral-50" />
      </div>
    )
  }

  if (isVideoFile(file) && url) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
        <video src={url} controls className="w-full max-h-48" />
      </div>
    )
  }

  return null
}
