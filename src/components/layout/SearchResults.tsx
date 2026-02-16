'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import type { SearchResult } from '@/hooks/useGlobalSearch'

function formatPersonYears(birthYear?: number, deathYear?: number): string | null {
  if (birthYear && deathYear) return `${birthYear}–${deathYear}`
  if (birthYear) return `n. ${birthYear}`
  if (deathYear) return `m. ${deathYear}`
  return null
}

function PosterPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[oklch(0.22_0.005_250)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-nav-foreground/20">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 17l5-5 4 4 3-3 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PortraitPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[oklch(0.22_0.005_250)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-nav-foreground/20">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

interface SearchResultsProps {
  query: string
  results: SearchResult | null
  loading: boolean
  hasResults: boolean
  onSelect?: () => void
  variant?: 'desktop' | 'mobile'
}

export default function SearchResults({
  query,
  results,
  loading,
  hasResults,
  onSelect,
  variant = 'desktop',
}: SearchResultsProps) {
  if (query.length < 2) return null

  const containerClass =
    variant === 'desktop'
      ? 'absolute right-0 top-full mt-1 w-80 overflow-hidden border border-[oklch(0.28_0.005_250_/_0.6)] bg-[oklch(0.19_0.005_250)] shadow-xl shadow-black/30 lg:w-96'
      : 'overflow-hidden border-t border-[oklch(0.28_0.005_250_/_0.2)] bg-[oklch(0.19_0.005_250)]'

  // Loading state
  if (loading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center px-4 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-nav-foreground/30" />
          <span className="ml-2 text-sm text-nav-foreground/30">Buscando...</span>
        </div>
      </div>
    )
  }

  // No results
  if (!hasResults) {
    return (
      <div className={containerClass}>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-nav-foreground/40">
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
        </div>
      </div>
    )
  }

  const movies = results?.movies ?? []
  const people = results?.people ?? []

  return (
    <div className={containerClass} role="listbox" aria-label="Resultados de búsqueda">
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Films section */}
        {movies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-4 pb-1.5 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                Películas
              </span>
              <span className="h-px flex-1 bg-nav-foreground/10" aria-hidden="true" />
            </div>
            <div>
              {movies.slice(0, 5).map((movie) => (
                <Link
                  key={movie.id}
                  href={`/pelicula/${movie.slug}`}
                  className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-nav-foreground/[0.06]"
                  onClick={onSelect}
                >
                  {/* Poster thumbnail */}
                  <div className="h-10 w-7 shrink-0 overflow-hidden bg-[oklch(0.22_0.005_250)]">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl}
                        alt=""
                        width={28}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PosterPlaceholder />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-nav-foreground/90 transition-colors group-hover:text-nav-foreground">
                      {movie.title}{' '}
                      {movie.year && (
                        <span className="text-nav-foreground/30">({movie.year})</span>
                      )}
                    </span>
                    {movie.director && (
                      <span className="block truncate text-[11px] text-nav-foreground/30">
                        {movie.director}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* People section */}
        {people.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-4 pb-1.5 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                Personas
              </span>
              <span className="h-px flex-1 bg-nav-foreground/10" aria-hidden="true" />
            </div>
            <div>
              {people.slice(0, 5).map((person) => (
                <Link
                  key={person.id}
                  href={`/persona/${person.slug}`}
                  className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-nav-foreground/[0.06]"
                  onClick={onSelect}
                >
                  {/* Portrait thumbnail */}
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[oklch(0.22_0.005_250)]">
                    {person.photoUrl ? (
                      <Image
                        src={person.photoUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PortraitPlaceholder />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-nav-foreground/90 transition-colors group-hover:text-nav-foreground">
                      {person.name}{' '}
                      {formatPersonYears(person.birthYear, person.deathYear) && (
                        <span className="text-nav-foreground/30">
                          ({formatPersonYears(person.birthYear, person.deathYear)})
                        </span>
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer link */}
        <div className="border-t border-nav-foreground/[0.08]">
          <Link
            href={`/buscar?q=${encodeURIComponent(query)}`}
            className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-nav-foreground/[0.04]"
            onClick={onSelect}
          >
            <span className="text-[12px] tracking-wide text-nav-foreground/40 transition-colors group-hover:text-nav-foreground/70">
              Ver todos los resultados
            </span>
            <span className="text-[11px] text-nav-foreground/20 transition-colors group-hover:text-accent">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
