'use client'

import MovieCardCompact from './MovieCardCompact'
import MovieCardDetailed from './MovieCardDetailed'
import { MovieListItem } from '@/lib/movies/movieListTypes'
import { ViewMode } from '@/components/shared/ViewToggle'
import ListGrid from '@/components/shared/ListGrid'

interface PeliculasGridProps {
  movies: MovieListItem[]
  isLoading: boolean
  viewMode: ViewMode
}

const skeletonCompact = (
  <>
    <div className="aspect-[2/3] rounded-sm bg-muted/30" />
    <div className="mt-2 h-3 rounded bg-muted/20" />
    <div className="mt-1 h-2.5 w-2/3 rounded bg-muted/15" />
  </>
)

const skeletonDetailed = (
  <div className="flex gap-4 py-4 md:gap-5">
    <div className="aspect-[2/3] w-20 shrink-0 rounded-sm bg-muted/30 md:w-24" />
    <div className="flex flex-1 flex-col justify-center gap-2">
      <div className="h-4 w-3/4 rounded bg-muted/20" />
      <div className="h-3 w-1/2 rounded bg-muted/15" />
      <div className="h-3 w-2/3 rounded bg-muted/15" />
    </div>
  </div>
)

export default function PeliculasGrid({ movies, isLoading, viewMode }: PeliculasGridProps) {
  return (
    <ListGrid
      items={movies}
      isLoading={isLoading}
      viewMode={viewMode}
      renderCompact={(movie) => <MovieCardCompact movie={movie} />}
      renderDetailed={(movie) => <MovieCardDetailed movie={movie} />}
      gridClassCompact="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6"
      gridClassDetailed="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
      skeletonCompact={skeletonCompact}
      skeletonDetailed={skeletonDetailed}
      emptyMessage="No se encontraron películas con los filtros seleccionados."
      keyExtractor={(movie) => movie.id}
    />
  )
}
