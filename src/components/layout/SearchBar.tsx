// src/components/layout/SearchBar.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Film, User, Loader2, ArrowRight } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function SearchBar() {
    const [showResults, setShowResults] = useState(false)
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

    // Cerrar el dropdown cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Mostrar resultados cuando hay query
    useEffect(() => {
        if (query.length >= 2) {
            setShowResults(true)
        } else {
            setShowResults(false)
        }
    }, [query])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            router.push(`/buscar?q=${encodeURIComponent(query)}`)
            setShowResults(false)
            clearSearch()
        }
    }

    const handleResultClick = () => {
        setShowResults(false)
        clearSearch()
    }

    const handleClear = () => {
        clearSearch()
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
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.length >= 2 && setShowResults(true)}
                        placeholder="Buscar películas o personas..."
                        className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent focus:bg-zinc-700 transition-all"
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
                                        {results!.movies.map((movie) => (
                                            <Link
                                                key={movie.id}
                                                href={`/peliculas/${movie.slug}`}
                                                onClick={handleResultClick}
                                                className="flex items-center px-4 py-3 hover:bg-zinc-800 transition-colors group"
                                            >
                                                <div className="flex-shrink-0 w-10 h-14 bg-zinc-800 rounded overflow-hidden mr-3">
                                                    {movie.posterUrl ? (
                                                        <Image
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
                                        {results!.people.map((person) => (
                                            <Link
                                                key={person.id}
                                                href={`/personas/${person.slug}`}
                                                onClick={handleResultClick}
                                                className="flex items-center px-4 py-3 hover:bg-zinc-800 transition-colors group"
                                            >
                                                <div className="flex-shrink-0 w-10 h-10 bg-zinc-800 rounded-full overflow-hidden mr-3">
                                                    {person.photoUrl ? (
                                                        <Image
                                                            src={person.photoUrl}
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
                                                    {person.birthYear && (
                                                        <p className="text-xs text-zinc-400">n. {person.birthYear}</p>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* Link para ver todos los resultados */}
                                <Link
                                    href={`/buscar?q=${encodeURIComponent(query)}`}
                                    onClick={handleResultClick}
                                    className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-sm text-zinc-400 hover:text-white font-medium group transition-colors"
                                >
                                    <span>Ver todos los resultados para "{query}"</span>
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
                                <p className="text-sm font-medium text-white">"{query}"</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    )
}