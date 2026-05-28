export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary:
      'bg-neutral-900 hover:bg-neutral-700 text-white focus:ring-neutral-400 disabled:bg-neutral-300 disabled:text-neutral-500',
    secondary:
      'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 focus:ring-neutral-300 disabled:opacity-50',
    ghost:
      'bg-transparent hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 focus:ring-neutral-200 disabled:opacity-50',
    danger:
      'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 focus:ring-neutral-300 disabled:opacity-50',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {children}
    </button>
  )
}
