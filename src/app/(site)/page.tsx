// src/app/page.tsx — Server Component
import { getHomeFeed } from '@/lib/queries/home'
import HeroSection from '@/components/home/HeroSection'
import MoviesGrid from '@/components/home/MoviesGrid'
import RecentMoviesSection from '@/components/home/RecentMoviesSection'
import RecentPeopleSection from '@/components/home/RecentPeopleSection'
import ObituariosSection from '@/components/home/ObituariosSection'
import EfemeridesSection from '@/components/home/EfemeridesSection'
import type { MovieWithRelease } from '@/types/home.types'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 300 // 5 min ISR

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function formatearFechaEstreno(movie: MovieWithRelease): string {
  if (!movie.releaseYear) return 'Fecha por confirmar'
  if (!movie.releaseMonth) return movie.releaseYear.toString()
  if (!movie.releaseDay) return MESES[movie.releaseMonth - 1]
  return `${movie.releaseDay} de ${MESES[movie.releaseMonth - 1].toLowerCase()}`
}

export default async function HomePage() {
  const {
    ultimosEstrenos,
    proximosEstrenos,
    ultimasPeliculas,
    ultimasPersonas,
    heroImages,
    obituarios,
    efemerides,
  } = await getHomeFeed()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="sr-only">cinenacional.com — Base de datos del cine argentino</h1>

      {/* Hero Section — next/image con priority genera el preload automáticamente */}
      {heroImages.length > 0 && (
        <HeroSection images={heroImages} />
      )}

      {/* Contenido principal */}
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
        <div className="flex flex-col gap-12 py-12">

          {/* Últimos Estrenos */}
          <MoviesGrid
            title="Últimos estrenos"
            movies={ultimosEstrenos as unknown as MovieWithRelease[]}
            loading={false}
            emptyMessage="No hay estrenos disponibles en este momento"
            showDate={true}
            dateType="past"
            dateFormatter={formatearFechaEstreno}
            ctaText="Ver más estrenos"
            ctaHref="/listados/estrenos"
          />

          {/* Próximos Estrenos */}
          <MoviesGrid
            title="Próximos estrenos"
            movies={proximosEstrenos as unknown as MovieWithRelease[]}
            loading={false}
            emptyMessage="No hay próximos estrenos confirmados"
            showDate={true}
            dateType="future"
            dateFormatter={formatearFechaEstreno}
            showFutureBadge={false}
            ctaText="Ver más próximos estrenos"
            ctaHref="/listados/estrenos/proximos"
          />

          {/* Grid de Obituarios y Efemérides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <ObituariosSection obituarios={obituarios} />
            <EfemeridesSection efemerides={efemerides} />
          </div>

          {/* Banner UCINE */}
          <div className="flex justify-center">
            <Link
              href="https://www.ucine.edu.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[601px] w-full"
            >
              <Image
                src="/fuc.png"
                alt="Programas de formación UCINE"
                width={601}
                height={101}
                className="w-full h-auto"
              />
            </Link>
          </div>

          {/* Últimas Películas Ingresadas */}
          <RecentMoviesSection
            movies={ultimasPeliculas}
            loading={false}
          />

          {/* Últimas Personas Ingresadas */}
          <RecentPeopleSection
            people={ultimasPersonas}
            loading={false}
          />
        </div>
      </div>
    </div>
  )
}
