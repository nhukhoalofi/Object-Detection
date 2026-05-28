import Badge from '../common/Badge.jsx'
import { getClassNameVI, formatConfidence, formatDepth, formatStatus } from '../../utils/formatUtils.js'
import { bboxToString } from '../../utils/bboxUtils.js'

export default function DetectionTable({ objects = [] }) {
  if (!objects.length) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-neutral-400">
        Không có object được phát hiện
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            {['ID', 'Lớp', 'Độ tin cậy', 'BBox 2D', 'Track ID', 'Độ sâu', 'Pose', 'Trạng thái'].map(
              (h) => (
                <th
                  key={h}
                  className="px-2 py-2.5 text-left font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {objects.map((obj, index) => (
            <tr
              key={obj.id ?? index}
              className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
            >
              <td className="px-2 py-2.5 font-mono text-neutral-500">{obj.id}</td>
              <td className="px-2 py-2.5 whitespace-nowrap">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                  {getClassNameVI(obj.label || obj.class_name || obj.className)}
                </span>
              </td>
              <td className="px-2 py-2.5 font-mono text-neutral-700">
                {formatConfidence(obj.confidence)}
              </td>
              <td className="px-2 py-2.5 font-mono text-neutral-500 whitespace-nowrap">
                {bboxToString(obj.bbox_2d)}
              </td>
              <td className="px-2 py-2.5 font-mono text-neutral-600">
                {obj.track_id !== undefined ? `#${obj.track_id}` : '-'}
              </td>
              <td className="px-2 py-2.5 font-mono text-neutral-700 whitespace-nowrap">
                {formatDepth(obj.depth)}
              </td>
              <td className="px-2 py-2.5 font-mono text-neutral-700 whitespace-nowrap">
                {obj.keypoints ? <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-1.5 py-0.5 rounded">Có</span> : '-'}
              </td>
              <td className="px-2 py-2.5 whitespace-nowrap">
                <Badge variant="default">
                  {formatStatus(obj.status || 'tracked')}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
