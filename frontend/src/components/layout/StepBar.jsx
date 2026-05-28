export default function StepBar({ currentStep }) {
  const steps = [
    { id: 1, label: 'Tải file' },
    { id: 2, label: 'Cấu hình' },
    { id: 3, label: 'Nhận diện' },
    { id: 4, label: 'Kết quả' }
  ]

  return (
    <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-6 py-3 shrink-0 shadow-sm">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between sm:justify-start sm:gap-10">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          
          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Circle Icon */}
              <div
                className={`flex items-center justify-center w-[34px] h-[34px] rounded-full text-sm font-bold font-mono transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-md'
                    : isCompleted
                    ? 'bg-neutral-800 text-white'
                    : 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              
              {/* Label */}
              <span
                className={`hidden sm:block text-[16px] transition-colors ${
                  isActive
                    ? 'font-bold text-[#111827]'
                    : isCompleted
                    ? 'font-semibold text-neutral-700'
                    : 'font-semibold text-[#6b7280]'
                }`}
              >
                {step.label}
              </span>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden sm:block w-8 lg:w-16 h-[1px] bg-[#e5e7eb] ml-5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
