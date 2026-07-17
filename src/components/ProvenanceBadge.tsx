import React from 'react'
import type { ProvenanceCategory, ProvenanceBadge as ProvenanceBadgeType } from '@/types/education'
import { PROVENANCE_BADGES } from '@/types/education'

interface ProvenanceBadgeProps {
  category: ProvenanceCategory
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
}

const iconSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}

export function ProvenanceBadge({
  category,
  showTooltip = true,
  size = 'md',
  className = ''
}: ProvenanceBadgeProps) {
  const badge = PROVENANCE_BADGES[category]
  
  const badgeElement = (
    <span
      className={`
        inline-flex items-center rounded-full
        ${sizeClasses[size]}
        font-medium
        border-2
        ${getColorClasses(badge.color)}
        ${className}
      `}
    >
      <span className={`${iconSizes[size]} mr-1.5`}>{badge.icon}</span>
      <span className="hidden sm:inline">{badge.label}</span>
    </span>
  )
  
  if (!showTooltip) {
    return badgeElement
  }
  
  return (
    <span className="inline-flex" title={badge.description}>
      {badgeElement}
    </span>
  )
}

function getColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
    blue: 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100',
    amber: 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100',
    red: 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100',
    purple: 'border-purple-500 text-purple-700 bg-purple-50 hover:bg-purple-100',
    orange: 'border-orange-500 text-orange-700 bg-orange-50 hover:bg-orange-100',
    cyan: 'border-cyan-500 text-cyan-700 bg-cyan-50 hover:bg-cyan-100',
  }
  return colorMap[color] || colorMap.blue
}

// Multi-badge display for outputs with multiple provenance aspects
interface ProvenanceStackProps {
  categories: ProvenanceCategory[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProvenanceStack({
  categories,
  size = 'sm',
  className = ''
}: ProvenanceStackProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {categories.map((category) => (
        <ProvenanceBadge
          key={category}
          category={category}
          size={size}
          showTooltip={true}
        />
      ))}
    </div>
  )
}

// Status indicator for education mode compliance
interface EducationModeStatusProps {
  mode: 'education' | 'analysis' | 'forecast' | 'classroom'
  hasWarnings?: boolean
  warningCount?: number
  className?: string
}

export function EducationModeStatus({
  mode,
  hasWarnings = false,
  warningCount = 0,
  className = ''
}: EducationModeStatusProps) {
  const modeConfig = {
    education: {
      label: 'Education Mode',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🎓'
    },
    analysis: {
      label: 'Analysis Mode',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🔍'
    },
    forecast: {
      label: 'Forecast Mode',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: '📊'
    },
    classroom: {
      label: 'Classroom Mode',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '👨‍🏫'
    }
  }
  
  const config = modeConfig[mode]
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color} ${className}`}>
      <span className="text-lg">{config.icon}</span>
      <span className="font-medium text-sm">{config.label}</span>
      {hasWarnings && (
        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
          {warningCount} warnings
        </span>
      )}
    </div>
  )
}

// Provenance verification banner
interface ProvenanceBannerProps {
  category: ProvenanceCategory
  stepByStepAvailable?: boolean
  onShowSteps?: () => void
  className?: string
}

export function ProvenanceBanner({
  category,
  stepByStepAvailable = false,
  onShowSteps,
  className = ''
}: ProvenanceBannerProps) {
  const badge = PROVENANCE_BADGES[category]
  
  return (
    <div className={`
      rounded-lg border-2 p-3
      ${getBannerColorClasses(badge.color)}
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{badge.label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{badge.description}</p>
          
          {badge.requiresVerification && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-emerald-600 text-xs font-medium">✓ Mathematically verified</span>
              {stepByStepAvailable && onShowSteps && (
                <button
                  onClick={onShowSteps}
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                >
                  Show reasoning steps
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getBannerColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-300 bg-emerald-50/50',
    blue: 'border-blue-300 bg-blue-50/50',
    amber: 'border-amber-300 bg-amber-50/50',
    red: 'border-red-300 bg-red-50/50',
    purple: 'border-purple-300 bg-purple-50/50',
    orange: 'border-orange-300 bg-orange-50/50',
    cyan: 'border-cyan-300 bg-cyan-50/50',
  }
  return colorMap[color] || colorMap.blue
}
