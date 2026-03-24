'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X } from 'lucide-react'
import HeaderStats from './HeaderStats'
import SearchResults from './SearchResults'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'

const navLinks = [
  { href: '/listados/peliculas', label: 'Películas' },
  { href: '/listados/personas', label: 'Personas' },
  { href: '/listados/estrenos/proximos', label: 'Estrenos' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const desktopSearchRef = useRef<HTMLInputElement>(null)
  const desktopSearchWrapperRef = useRef<HTMLDivElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const {
    query,
    setQuery,
    results,
    loading,
    clearSearch,
    hasResults,
  } = useGlobalSearch(2)

  // Lista plana de resultados para navegación por teclado
  const flatItems = useMemo(() => {
    if (!results) return []
    const items: { type: 'movie' | 'person'; slug: string }[] = []
    for (const movie of results.movies.slice(0, 5)) {
      items.push({ type: 'movie', slug: movie.slug })
    }
    for (const person of results.people.slice(0, 5)) {
      items.push({ type: 'person', slug: person.slug })
    }
    return items
  }, [results])

  // Handler de teclado para los inputs de búsqueda
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setDesktopSearchExpanded(false)
      setSearchOpen(false)
      setSelectedIndex(-1)
      clearSearch()
      return
    }

    if (e.key === 'ArrowDown' && flatItems.length > 0) {
      e.preventDefault()
      setSelectedIndex(prev => prev < flatItems.length - 1 ? prev + 1 : 0)
      return
    }

    if (e.key === 'ArrowUp' && flatItems.length > 0) {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : flatItems.length - 1)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && flatItems[selectedIndex]) {
        const item = flatItems[selectedIndex]
        const href = item.type === 'movie' ? `/pelicula/${item.slug}` : `/persona/${item.slug}`
        router.push(href)
      } else if (query.trim()) {
        router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
      }
      setDesktopSearchExpanded(false)
      setSearchOpen(false)
      setSelectedIndex(-1)
      clearSearch()
    }
  }, [flatItems, selectedIndex, query, router, clearSearch])

  // Focus helpers — called from event handlers instead of useEffect
  const expandDesktopSearch = useCallback(() => {
    setDesktopSearchExpanded(true)
    // requestAnimationFrame ensures the input is rendered before focusing
    requestAnimationFrame(() => desktopSearchRef.current?.focus())
  }, [])

  const toggleMobileSearch = useCallback(() => {
    setSearchOpen(prev => {
      const next = !prev
      if (next) {
        requestAnimationFrame(() => mobileSearchInputRef.current?.focus())
      }
      return next
    })
  }, [])

  // Click outside closes desktop search
  const handleClickOutsideSearch = useCallback(() => {
    setDesktopSearchExpanded(false)
    setSelectedIndex(-1)
    clearSearch()
  }, [clearSearch])
  useClickOutside(desktopSearchWrapperRef, handleClickOutsideSearch, desktopSearchExpanded)

  const handleResultSelect = () => {
    setDesktopSearchExpanded(false)
    setSearchOpen(false)
    setMobileMenuOpen(false)
    setSelectedIndex(-1)
    clearSearch()
  }

  return (
    <header className="sticky top-0 z-50">
      {/* Main Navigation Bar */}
      <div className="bg-nav">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          {/* Logo + Desktop Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/images/logo.svg"
                alt="cinenacional.com"
                width={777}
                height={163}
                className="h-12 sm:h-14 w-auto"
                priority
              />
            </Link>

            {/* Vertical separator */}
            <span
              className="hidden h-4 w-px bg-nav-foreground/15 md:block"
              aria-hidden="true"
            />

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-sans text-sm font-medium tracking-wide text-nav-foreground/60 transition-colors hover:text-nav-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Desktop Search + Mobile Toggles */}
          <div className="flex items-center gap-3">
            {/* Desktop Search: compact button that expands */}
            <div className="hidden md:block" ref={desktopSearchWrapperRef}>
              {desktopSearchExpanded ? (
                <div className="relative flex items-center">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent"
                    aria-hidden="true"
                  />
                  <input
                    ref={desktopSearchRef}
                    type="search"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Películas, personas..."
                    className="h-9 w-64 border-b border-accent/40 bg-transparent pl-9 pr-8 font-sans text-sm text-nav-foreground placeholder:text-nav-foreground/30 focus:outline-hidden lg:w-72"
                    aria-label="Buscar películas y personas"
                    aria-expanded={query.length >= 2}
                    aria-controls="desktop-search-results"
                    aria-haspopup="listbox"
                    role="combobox"
                    autoComplete="off"
                    aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopSearchExpanded(false)
                      clearSearch()
                    }}
                    className="absolute right-0 top-1/2 flex h-9 w-8 -translate-y-1/2 items-center justify-center text-nav-foreground/30 transition-colors hover:text-nav-foreground"
                    aria-label="Cerrar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Desktop search results dropdown */}
                  <SearchResults
                    query={query}
                    results={results}
                    loading={loading}
                    hasResults={hasResults}
                    variant="desktop"
                    onSelect={handleResultSelect}
                    selectedIndex={selectedIndex}
                    onHover={setSelectedIndex}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={expandDesktopSearch}
                  className="flex h-9 items-center gap-2 border-b border-transparent px-1 font-sans text-nav-foreground/30 transition-colors hover:border-nav-foreground/15 hover:text-nav-foreground/60"
                  aria-label="Abrir búsqueda"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-sm tracking-wide">Buscar</span>
                </button>
              )}
            </div>

            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => {
                toggleMobileSearch()
                if (!searchOpen) clearSearch()
                if (mobileMenuOpen) setMobileMenuOpen(false)
              }}
              className="flex h-9 w-9 items-center justify-center text-nav-foreground/70 transition-colors hover:text-nav-foreground md:hidden"
              aria-label={searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
                if (searchOpen) setSearchOpen(false)
              }}
              className="flex h-9 w-9 items-center justify-center text-nav-foreground/70 transition-colors hover:text-nav-foreground md:hidden"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Drawer */}
        {searchOpen && (
          <div className="border-t border-nav-foreground/10 md:hidden">
            <div className="px-4 py-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                  aria-hidden="true"
                />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Películas, personas..."
                  className="h-10 w-full border-b border-nav-foreground/10 bg-transparent pl-10 pr-3 font-sans text-base text-nav-foreground placeholder:text-nav-foreground/30 focus:border-accent/40 focus:outline-hidden"
                  aria-label="Buscar películas y personas"
                  autoComplete="off"
                  aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
                />
              </div>
            </div>
            {/* Mobile search results */}
            <SearchResults
              query={query}
              results={results}
              loading={loading}
              hasResults={hasResults}
              variant="mobile"
              onSelect={handleResultSelect}
              selectedIndex={selectedIndex}
              onHover={setSelectedIndex}
            />
          </div>
        )}

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <nav
            className="border-t border-nav-foreground/10 md:hidden"
            aria-label="Navegación móvil"
          >
            <div className="py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group block border-b border-nav-foreground/6 py-4 last:border-b-0"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center justify-center gap-4">
                    <span className="h-px w-8 bg-nav-foreground/15 transition-all group-hover:w-12 group-hover:bg-accent" />
                    <span className="font-sans text-[15px] font-medium tracking-wide text-nav-foreground/80 transition-colors group-hover:text-nav-foreground">
                      {link.label}
                    </span>
                    <span className="h-px w-8 bg-nav-foreground/15 transition-all group-hover:w-12 group-hover:bg-accent" />
                  </span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>

      {/* Stats Strip */}
      <HeaderStats />
    </header>
  )
}
