import FeatureUnavailable from '../common/FeatureUnavailable.jsx'

export default function PoseEstimationPanel({ objects = [] }) {
  const poseObjects = objects.filter((o) => Array.isArray(o.keypoints) && o.keypoints.length > 0)

  if (!poseObjects.length) {
    return (
      <FeatureUnavailable
        title="Chưa có dữ liệu dáng người"
        message="Bật tùy chọn dáng người và chạy nhận diện với ảnh/video có người."
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-4">
        <span className="text-[18px] sm:text-[20px] font-bold text-neutral-900 border-l-[4px] border-neutral-900 pl-3 leading-none">
          Dáng người
        </span>
        <span className="text-sm text-neutral-500 font-medium bg-neutral-100 px-2 py-1 rounded">
          {poseObjects.length} đối tượng
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {poseObjects.map((obj, i) => {
          const hasTrackId = obj.track_id !== null && obj.track_id !== undefined

          return (
            <div
              key={obj.id || i}
              className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm flex flex-col hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                <span className="text-sm font-bold text-neutral-800">
                  Người #{obj.id || i}{hasTrackId ? ` - theo dõi #${obj.track_id}` : ''}
                </span>
                {obj.pose_confidence && (
                  <span className="text-xs text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">
                    {Math.round(obj.pose_confidence * 100)}%
                  </span>
                )}
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-500 mb-2">
                  Các điểm trên cơ thể ({obj.keypoints.length})
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {obj.keypoints.map((pt, j) => (
                    <div
                      key={j}
                      className="flex justify-between items-center text-xs font-mono bg-neutral-50 px-2 py-1 rounded border border-neutral-100"
                    >
                      <span className="text-neutral-400 mr-2 text-[10px]">Điểm {j + 1}</span>
                      <span className="text-neutral-700">[{Math.round(pt[0])}, {Math.round(pt[1])}]</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
