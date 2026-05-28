export default function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="text-[18px] sm:text-[20px] font-bold text-neutral-900 border-l-[4px] border-neutral-900 pl-3 leading-none">
            {title}
          </h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
