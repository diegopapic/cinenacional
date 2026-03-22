'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useState } from 'react'
import Link from 'next/link'
import { PosterPlaceholder } from '@/components/film/PosterPlaceholder'

interface Movie {
  id: number
  slug: string
  title: string
  year?: number | null
  releaseYear?: number | null
  posterUrl?: string | null
  tipoDuracion?: string | null
  stage?: string | null
}

export interface AllRolesItem {
  movie: Movie
  rolesDisplay: string[]
}

interface TabItem {
  movie: Movie
  roles: string[]
  characterName?: string | null
}

export interface RoleSection {
  roleName: string
  items: TabItem[]
}

interface PersonFilmographyProps {
  allRolesList: AllRolesItem[]
  roleSections: RoleSection[]
}

function getEffectiveYear(movie: Movie): number {
  return movie.year || movie.releaseYear || 0
}

function getMovieBadge(movie: Movie): { text: string; color: string } | null {
  const isUnreleased = !movie.releaseYear

  if (movie.stage === 'EN_DESARROLLO') {
    return { text: 'En desarrollo', color: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' }
  }
  if (movie.stage === 'EN_PRODUCCION') {
    return { text: 'En producción', color: 'bg-green-500/20 text-green-300 border border-green-500/30' }
  }
  if (movie.stage === 'EN_PREPRODUCCION') {
    return { text: 'En preproducción', color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' }
  }
  if (movie.stage === 'EN_RODAJE') {
    return { text: 'En rodaje', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' }
  }
  if (movie.stage === 'EN_POSTPRODUCCION') {
    return { text: 'En postproducción', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' }
  }
  if (movie.stage === 'INCONCLUSA') {
    return { text: 'Inconclusa', color: 'bg-red-500/20 text-red-300 border border-red-500/30' }
  }
  if (movie.tipoDuracion === 'cortometraje') {
    return { text: 'Cortometraje', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' }
  }
  if (movie.tipoDuracion === 'mediometraje') {
    return { text: 'Mediometraje', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' }
  }
  if (movie.tipoDuracion === 'largometraje' && isUnreleased && movie.stage !== 'INCONCLUSA' && movie.stage !== 'INEDITA') {
    return { text: 'No estrenada en la Argentina', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' }
  }
  return null
}

function FilmographyInfoTooltip() {
  return (
    <div className="relative group">
      <button
        type="button"
        className="w-5 h-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground/50 hover:text-foreground text-xs flex items-center justify-center transition-colors"
        aria-label="Más información"
      >
        ?
      </button>
      <div className="absolute right-0 md:left-0 md:right-auto top-full mt-2 w-72 p-3 bg-muted border border-border/30 rounded-lg shadow-xl font-sans text-xs leading-relaxed text-muted-foreground/80 font-normal opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        Esta filmografía incluye únicamente películas argentinas o coproducciones con participación de Argentina. Los trabajos realizados exclusivamente en el exterior no están incluidos.
      </div>
    </div>
  )
}

function MovieItem({ item, showRoles, showCharacter, index }: {
  item: any
  showRoles: boolean
  showCharacter: boolean
  index: number
}) {
  const movie = item.movie
  const year = getEffectiveYear(movie)
  const displayYear = year > 0 ? year : null
  const badge = getMovieBadge(movie)

  return (
    <div key={`${movie.id}-${index}`} className="py-3 hover:bg-muted/20 transition-colors group">
      <div className="flex items-center gap-3">
        <Link href={`/pelicula/${movie.slug}`} className="shrink-0">
          <div className="w-10 md:w-11 aspect-2/3 rounded-xs overflow-hidden">
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <PosterPlaceholder className="w-full h-full" />
            )}
          </div>
        </Link>
        <div className="grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/pelicula/${movie.slug}`}
              className="text-[13px] md:text-sm font-medium leading-snug text-foreground/80 hover:text-accent transition-colors inline-block"
            >
              {movie.title}
            </Link>
            {displayYear && (
              <span className="text-[11px] md:text-[12px] tabular-nums text-muted-foreground/40">
                ({displayYear})
              </span>
            )}
            {badge && (
              <span className={`text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                {badge.text}
              </span>
            )}
            {showRoles && item.rolesDisplay && item.rolesDisplay.length > 0 && (
              <span className="text-[12px] text-muted-foreground/50">
                ({item.rolesDisplay.join('; ')})
              </span>
            )}
            {showCharacter && item.characterName && (
              <span className="text-[12px] text-muted-foreground/50">
                — {item.characterName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShowMoreButton({ showAll, onToggle }: { showAll: boolean; onToggle: () => void }) {
  return (
    <div className="mt-8 text-center">
      <button
        onClick={onToggle}
        className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center space-x-2 mx-auto"
      >
        <span>{showAll ? 'Ver menos' : 'Ver filmografía completa'}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

export function PersonFilmography({ allRolesList, roleSections }: PersonFilmographyProps) {
  const [activeTab, setActiveTab] = useState<string>('Todos los roles')
  const [showAllFilmography, setShowAllFilmography] = useState(false)

  const hasFilmography = allRolesList.length > 0
  const hasSingleRole = roleSections.length === 1
  const tabs = hasFilmography && !hasSingleRole ? ['Todos los roles', 'Por rol'] : []

  if (!hasFilmography) return null

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Navigation Tabs */}
        {tabs.length > 0 && (
          <div className="border-b border-border/30 mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveTab(tabName)
                    setShowAllFilmography(false)
                  }}
                  className={`pb-4 px-1 border-b-2 font-medium text-[13px] md:text-sm tracking-wide whitespace-nowrap transition-colors ${activeTab === tabName
                    ? 'border-accent text-foreground'
                    : 'border-transparent text-muted-foreground/50 hover:text-foreground'
                    }`}
                >
                  {tabName === 'Todos los roles'
                    ? `${tabName} (${allRolesList.length})`
                    : `${tabName} (${roleSections.length})`
                  }
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        {hasSingleRole ? (
          <div className="space-y-1">
            <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-6 flex items-center gap-2">
              Filmografía en Argentina — {roleSections[0].roleName}
              <FilmographyInfoTooltip />
            </h2>
            <div className="divide-y divide-border/10">
              {(showAllFilmography ? roleSections[0].items : roleSections[0].items.slice(0, 10)).map((item, index) => (
                <MovieItem
                  key={`${item.movie.id}-${index}`}
                  item={item}
                  index={index}
                  showRoles={false}
                  showCharacter={roleSections[0].roleName === 'Actuación'}
                />
              ))}
            </div>
            {roleSections[0].items.length > 10 && (
              <ShowMoreButton showAll={showAllFilmography} onToggle={() => setShowAllFilmography(!showAllFilmography)} />
            )}
          </div>
        ) : activeTab === 'Todos los roles' ? (
          <div className="space-y-1">
            <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-6 flex items-center gap-2">
              Filmografía en Argentina
              <FilmographyInfoTooltip />
            </h2>
            <div className="divide-y divide-border/10">
              {(showAllFilmography ? allRolesList : allRolesList.slice(0, 10)).map((item, index) => (
                <MovieItem
                  key={`${item.movie.id}-${index}`}
                  item={item}
                  index={index}
                  showRoles={true}
                  showCharacter={false}
                />
              ))}
            </div>
            {allRolesList.length > 10 && (
              <ShowMoreButton showAll={showAllFilmography} onToggle={() => setShowAllFilmography(!showAllFilmography)} />
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-6 flex items-center gap-2">
              Filmografía en Argentina
              <FilmographyInfoTooltip />
            </h2>
            <div className="space-y-10">
              {roleSections.map((section) => (
                <div key={section.roleName} className="space-y-1">
                  <h3 className="font-serif text-lg md:text-xl text-foreground mb-4">
                    {section.roleName}
                    <span className="text-muted-foreground/40 ml-2">({section.items.length})</span>
                  </h3>
                  <div className="divide-y divide-border/10">
                    {section.items.map((item, index) => (
                      <MovieItem
                        key={`${item.movie.id}-${index}`}
                        item={item}
                        index={index}
                        showRoles={false}
                        showCharacter={section.roleName === 'Actuación'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
