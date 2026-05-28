export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    info: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    success: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    warning: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    error: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    alt: 'bg-neutral-900 text-white border border-neutral-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  )
}
