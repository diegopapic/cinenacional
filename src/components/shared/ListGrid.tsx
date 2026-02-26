'use client'

import { ReactNode } from 'react'
import type { ViewMode } from '@/lib/shared/listTypes'

interface ListGridProps<T> {
  items: T[]
  isLoading: boolean
  viewMode: ViewMode
  renderCompact: (item: T) => ReactNode
  renderDetailed: (item: T) => ReactNode
  gridClassCompact: string
  gridClassDetailed: string
  skeletonCompact: ReactNode
  skeletonDetailed: ReactNode
  skeletonCountCompact?: number
  skeletonCountDetailed?: number
  emptyMessage: string
  keyExtractor: (item: T) => string | number
}

export default function ListGrid<T>({
  items,
  isLoading,
  viewMode,
  renderCompact,
  renderDetailed,
  gridClassCompact,
  gridClassDetailed,
  skeletonCompact,
  skeletonDetailed,
  skeletonCountCompact = 12,
  skeletonCountDetailed = 6,
  emptyMessage,
  keyExtractor,
}: ListGridProps<T>) {
  const isCompact = viewMode === 'compact'
  const gridClass = isCompact ? gridClassCompact : gridClassDetailed

  if (isLoading) {
    const count = isCompact ? skeletonCountCompact : skeletonCountDetailed
    return (
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {isCompact ? skeletonCompact : skeletonDetailed}
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground/40">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={keyExtractor(item)}>
          {isCompact ? renderCompact(item) : renderDetailed(item)}
        </div>
      ))}
    </div>
  )
}
