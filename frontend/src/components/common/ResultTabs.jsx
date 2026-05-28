import { useState } from 'react'

export default function ResultTabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex items-center gap-1 border-b border-neutral-200 mb-4 px-2">
        {tabs.map((tab, idx) => {
          const isActive = activeTab === idx
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {tabs[activeTab].content}
      </div>
    </div>
  )
}
