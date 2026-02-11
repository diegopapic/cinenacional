'use client'

import Link from 'next/link'
import Image from 'next/image'
import SearchBar from './SearchBar'
import HeaderStats from './HeaderStats'

export default function Header() {
  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo y nombre */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <Image
              src="/images/logo.svg"
              alt="cinenacional.com"
              width={180}
              height={40}
              className="h-10 sm:h-12 w-auto"
              priority
            />
          </Link>

          {/* Navegación principal */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/listados/peliculas"
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              Películas
            </Link>
            <Link
              href="/listados/personas"
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              Personas
            </Link>
          </nav>

          {/* Buscador en el centro - visible en desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-4">
            <SearchBar />
          </div>
        </div>

        {/* Buscador móvil - debajo del header principal */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>

        {/* Navegación móvil */}
        <nav className="sm:hidden flex items-center justify-center gap-6 pb-3">
          <Link
            href="/listados/peliculas"
            className="text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Películas
          </Link>
          <Link
            href="/listados/personas"
            className="text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Personas
          </Link>
        </nav>
      </div>

      <HeaderStats />
    </header>
  )
}