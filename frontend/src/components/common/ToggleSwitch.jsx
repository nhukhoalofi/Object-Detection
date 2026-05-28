export default function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 ${
          checked ? 'bg-neutral-900' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'bg-white translate-x-4' : 'bg-white translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}
