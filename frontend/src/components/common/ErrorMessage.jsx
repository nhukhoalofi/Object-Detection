export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
      <span className="text-neutral-500 text-base leading-none mt-0.5">⚠</span>
      <p className="text-sm text-neutral-700 whitespace-pre-line">{message}</p>
    </div>
  )
}
