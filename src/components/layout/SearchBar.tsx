// src/components/layout/SearchBar.tsx

'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useKeydown } from '@/hooks/useKeydown'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { Search, X, Film, User, Loader2, ArrowRight } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import { getPersonPhotoUrl } from '@/lib/images/imageUtils'

/**
 * Formatea los años de nacimiento y muerte de una persona.
 * - Ambos años: "1936-2017"
 * - Solo nacimiento: "n. 1936"
 * - Solo muerte: "m. 2017"
 */
function formatPersonYears(birthYear?: number, deathYear?: number): string | null {
  if (birthYear && deathYear) {
    return `${birthYear}-${deathYear}`
  }
  if (birthYear) {
    return `n. ${birthYear}`
  }
  if (deathYear) {
    return `m. ${deathYear}`
  }
  return null
}

export default function SearchBar() {
    const [showResults, setShowResults] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const {
        query,
        setQuery,
        results,
        loading,
        clearSearch,
        hasResults
    } = useGlobalSearch(2)

    // Lista plana de resultados para navegación por teclado
    const flatItems = useMemo(() => {
        if (!results) return []
        const items: { type: 'movie' | 'person'; slug: string }[] = []
        for (const movie of results.movies) {
            items.push({ type: 'movie', slug: movie.slug })
        }
        for (const person of results.people) {
            items.push({ type: 'person', slug: person.slug })
        }
        return items
    }, [results])

    // Cerrar el dropdown cuando se hace clic fuera
    useClickOutside(searchRef, useCallback(() => {
        setShowResults(false)
        setSelectedIndex(-1)
    }, []))

    // Cerrar con Escape
    useEscapeKey(useCallback(() => {
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
    }, []), showResults)

    // Navegación con flechas
    useKeydown(useCallback((e: KeyboardEvent) => {
        if (!showResults || flatItems.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => prev < flatItems.length - 1 ? prev + 1 : 0)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => prev > 0 ? prev - 1 : flatItems.length - 1)
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault()
            const item = flatItems[selectedIndex]
            const href = item.type === 'movie' ? `/pelicula/${item.slug}` : `/persona/${item.slug}`
            router.push(href)
            setShowResults(false)
            setSelectedIndex(-1)
            clearSearch()
        }
    }, [showResults, flatItems, selectedIndex, router, clearSearch]), showResults)

    // Actualizar query y mostrar/ocultar resultados
    const handleQueryChange = useCallback((value: string) => {
        setQuery(value)
        setShowResults(value.length >= 2)
        setSelectedIndex(-1)
    }, [setQuery])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Si hay un item seleccionado con flechas, navegar a ese item
        if (selectedIndex >= 0 && flatItems[selectedIndex]) {
            const item = flatItems[selectedIndex]
            const href = item.type === 'movie' ? `/pelicula/${item.slug}` : `/persona/${item.slug}`
            router.push(href)
            setShowResults(false)
            setSelectedIndex(-1)
            clearSearch()
            return
        }
        if (query.trim()) {
            const searchQuery = query.trim()
            setShowResults(false)
            setSelectedIndex(-1)
            clearSearch()
            router.push(`/buscar?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    const handleResultClick = () => {
        setShowResults(false)
        setSelectedIndex(-1)
        clearSearch()
    }

    const handleClear = () => {
        clearSearch()
        setSelectedIndex(-1)
        inputRef.current?.focus()
    }

    return (
        <div ref={searchRef} className="relative flex-1 max-w-md">
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onFocus={() => query.length >= 2 && setShowResults(true)}
                        placeholder="Buscar películas o personas..."
                        className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:border-transparent focus:bg-zinc-700 transition-all"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-zinc-700 rounded-full transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                        </button>
                    )}
                </div>
            </form>

            {/* Dropdown de resultados */}
            {showResults && (hasResults || loading || query.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800 z-50 overflow-hidden">
                    <div className="max-h-[70vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center text-zinc-400">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span>Buscando...</span>
                            </div>
                        ) : hasResults ? (
                            <>
                                {/* Resultados de películas */}
                                {results!.movies.length > 0 && (
                                    <div className="border-b border-zinc-800 last:border-0">
                                        <div className="px-4 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Películas
                                        </div>
                                        {results!.movies.map((movie, i) => (
                                            <Link
                                                key={movie.id}
                                                href={`/pelicula/${movie.slug}`}
                                                onClick={handleResultClick}
                                                onMouseEnter={() => setSelectedIndex(i)}
                                                className={`flex items-center px-4 py-3 transition-colors group ${selectedIndex === i ? 'bg-zinc-800' : 'hover:bg-zinc-800'}`}
                                            >
                                                <div className="shrink-0 w-10 h-14 bg-zinc-800 rounded-sm overflow-hidden mr-3">
                                                    {movie.posterUrl ? (
                                                        <Image
                                                            loader={cloudinaryLoader}
                                                            src={movie.posterUrl}
                                                            alt={movie.title}
                                                            width={40}
                                                            height={56}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                            <Film className="w-5 h-5 text-zinc-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate group-hover:text-zinc-300 transition-colors">
                                                        {movie.title}
                                                    </p>
                                                    <p className="text-xs text-zinc-400">
                                                        {movie.year && `${movie.year}`}
                                                        {movie.originalTitle && movie.originalTitle !== movie.title && (
                                                            <span className="ml-1">• {movie.originalTitle}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* Resultados de personas */}
                                {results!.people.length > 0 && (
                                    <div className="border-b border-zinc-800 last:border-0">
                                        <div className="px-4 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Personas
                                        </div>
                                        {results!.people.map((person, i) => {
                                            const itemIndex = (results!.movies.length) + i
                                            return (
                                            <Link
                                                key={person.id}
                                                href={`/persona/${person.slug}`}
                                                onClick={handleResultClick}
                                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                className={`flex items-center px-4 py-3 transition-colors group ${selectedIndex === itemIndex ? 'bg-zinc-800' : 'hover:bg-zinc-800'}`}
                                            >
                                                <div className="shrink-0 w-10 h-10 bg-zinc-800 rounded-full overflow-hidden mr-3">
                                                    {person.photoUrl ? (
                                                        <Image
                                                            loader={cloudinaryLoader}
                                                            src={getPersonPhotoUrl(person.photoUrl, 'sm')!}
                                                            alt={person.name}
                                                            width={40}
                                                            height={40}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                            <User className="w-5 h-5 text-zinc-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate group-hover:text-zinc-300 transition-colors">
                                                        {person.name}
                                                    </p>
                                                    {formatPersonYears(person.birthYear, person.deathYear) && (
                                                        <p className="text-xs text-zinc-400">
                                                            {formatPersonYears(person.birthYear, person.deathYear)}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Link para ver todos los resultados */}
                                <Link
                                    href={`/buscar?q=${encodeURIComponent(query)}`}
                                    onClick={handleResultClick}
                                    className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-sm text-zinc-400 hover:text-white font-medium group transition-colors"
                                >
                                    <span>Ver todos los resultados para &quot;{query}&quot;</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </>
                        ) : query.length >= 2 ? (
                            <div className="p-8 text-center">
                                <div className="text-zinc-600 mb-2">
                                    <Search className="w-12 h-12 mx-auto" />
                                </div>
                                <p className="text-sm text-zinc-400">
                                    No se encontraron resultados para
                                </p>
                                <p className="text-sm font-medium text-white">&quot;{query}&quot;</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    )
}