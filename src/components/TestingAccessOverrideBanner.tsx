import React from 'react'

interface TestingAccessOverrideBannerProps {
  scope: string
}

const TestingAccessOverrideBanner: React.FC<TestingAccessOverrideBannerProps> = ({ scope }) => {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      Testing override active for {scope}. The UI is temporarily unlocked without changing live entitlements.
    </div>
  )
}

export default TestingAccessOverrideBanner
