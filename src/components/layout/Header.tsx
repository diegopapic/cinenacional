'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import SearchBar from './SearchBar'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Películas', href: '/listados/peliculas' },
    { name: 'Personas', href: '/listados/personas' },
    { name: 'Géneros', href: '/generos' },
    { name: 'Sobre Nosotros', href: '/sobre-nosotros' },
  ]

  const isActive = (href: string) => {
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo y nombre */}
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <Image 
              src="/logo.svg" 
              alt="cinenacional.com" 
              width={180} 
              height={40}
              className="h-10 sm:h-12 w-auto"
              priority
            />
          </Link>

          {/* Buscador en el centro - visible en desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-4">
            <SearchBar />
          </div>

          {/* Navegación principal - desktop */}
          <nav className="hidden md:flex items-center space-x-6 flex-shrink-0">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-red-500'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Botón menú móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Buscador móvil - debajo del header principal */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900">
          <nav className="px-4 py-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-zinc-800 text-red-500'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}