export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 xl:px-8 bg-white border-b border-neutral-200 h-[84px] shrink-0 shadow-sm overflow-hidden">
      {/* Left */}
      <div className="flex items-center gap-4 xl:gap-5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-white text-[13px] font-bold">
            3D
          </div>
          <span className="text-[20px] font-bold text-neutral-900 tracking-tight">
            Detect<span className="text-neutral-500">Track</span>
          </span>
        </div>
        
        <div className="w-px h-8 bg-neutral-300 shrink-0 hidden lg:block" />
        
        <h1 className="text-[24px] xl:text-[28px] font-[600] text-[#111827] whitespace-nowrap truncate tracking-tight">
          Hệ thống phát hiện và theo dõi vật thể 3D
        </h1>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end text-right shrink-0 ml-4">
        <span className="text-[15px] font-bold text-neutral-900">
          Đồ họa máy tính
        </span>
        <span className="text-[14px] text-[#6b7280] mt-0.5 whitespace-nowrap">
          24.Nh12 - Như Khoa, Cẩm Tuyền, Văn Vũ
        </span>
      </div>
    </header>
  )
}
