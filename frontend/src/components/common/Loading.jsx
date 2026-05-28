export default function Loading({ text = 'Đang tải...', size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-[3px]',
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizes[size] || sizes.md} rounded-full border-neutral-200 border-t-neutral-700 animate-spin`}
      />
      <span className="text-sm text-neutral-500">{text}</span>
    </div>
  )
}
