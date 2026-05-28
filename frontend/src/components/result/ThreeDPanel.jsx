import FeatureUnavailable from '../common/FeatureUnavailable.jsx'

export default function ThreeDPanel({ objects = [] }) {
  const objects3d = objects.filter((o) => o.bbox_3d)

  if (!objects3d.length) {
    return (
      <FeatureUnavailable
        title="Backend chưa trả dữ liệu 3D"
        message="Tính năng này đang chờ Backend hỗ trợ bbox_3d/WebGL."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
        <p className="text-xs text-neutral-500">Dữ liệu 3D được lấy trực tiếp từ Backend (bbox_3d).</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {objects3d.map((obj, i) => (
          <div key={obj.id || i} className="border border-neutral-200 rounded-lg p-3 bg-white text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">#{obj.track_id ?? '-'}</span>
              <span className="text-neutral-700">{obj.label || obj.class_name || obj.className || 'Unknown'}</span>
            </div>
            <div className="mt-2 text-neutral-500">
              center: [{obj.bbox_3d.center?.x ?? '-'}, {obj.bbox_3d.center?.y ?? '-'}, {obj.bbox_3d.center?.z ?? '-'}]
            </div>
            <div className="text-neutral-400">
              size: [{obj.bbox_3d.size?.width ?? '-'}, {obj.bbox_3d.size?.height ?? '-'}, {obj.bbox_3d.size?.depth ?? '-'}]
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}