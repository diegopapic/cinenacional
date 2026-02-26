'use client'

import PersonCardCompact from './PersonCardCompact'
import PersonCardDetailed from './PersonCardDetailed'
import { PersonWithMovie } from '@/lib/people/personListTypes'
import { ViewMode } from '@/components/shared/ViewToggle'
import ListGrid from '@/components/shared/ListGrid'

interface PersonasGridProps {
  people: PersonWithMovie[]
  isLoading: boolean
  viewMode: ViewMode
}

const skeletonCompact = (
  <div className="flex flex-col items-center">
    <div className="h-20 w-20 rounded-full bg-muted/30 md:h-24 md:w-24" />
    <div className="mx-auto mt-3 h-4 w-20 rounded bg-muted/30" />
    <div className="mx-auto mt-1 h-3 w-14 rounded bg-muted/30" />
  </div>
)

const skeletonDetailed = (
  <div className="flex gap-4 py-4 md:gap-5">
    <div className="h-28 w-20 shrink-0 rounded-sm bg-muted/30 md:h-32 md:w-24" />
    <div className="flex flex-1 flex-col justify-center gap-2">
      <div className="h-5 w-3/4 rounded bg-muted/30" />
      <div className="h-4 w-1/2 rounded bg-muted/30" />
      <div className="h-4 w-2/3 rounded bg-muted/30" />
    </div>
  </div>
)

export default function PersonasGrid({ people, isLoading, viewMode }: PersonasGridProps) {
  return (
    <ListGrid
      items={people}
      isLoading={isLoading}
      viewMode={viewMode}
      renderCompact={(person) => <PersonCardCompact person={person} />}
      renderDetailed={(person) => <PersonCardDetailed person={person} />}
      gridClassCompact="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6"
      gridClassDetailed="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
      skeletonCompact={skeletonCompact}
      skeletonDetailed={skeletonDetailed}
      skeletonCountCompact={24}
      skeletonCountDetailed={12}
      emptyMessage="No se encontraron personas con los filtros seleccionados."
      keyExtractor={(person) => person.id}
    />
  )
}
