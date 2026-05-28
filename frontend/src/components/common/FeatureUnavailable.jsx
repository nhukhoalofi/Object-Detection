export default function FeatureUnavailable({ title = 'Tính năng đang chờ Backend', message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-neutral-200 rounded-lg bg-neutral-50 text-center space-y-2">
      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
        <span className="text-lg">i</span>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <p className="text-xs text-neutral-400 mt-1">
          {message || 'Tính năng này đang chờ Backend hỗ trợ API.'}
        </p>
      </div>
    </div>
  )
}