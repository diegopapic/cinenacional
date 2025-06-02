'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Tipos
interface Pelicula {
  id: number
  title: string
  year: number
  synopsis?: string
  genre?: string[]
  director?: string
  image?: string
}

interface Persona {
  id: number
  name: string
  roles: string[]
  image?: string
  birthYear?: number
}

// Datos de ejemplo para el carrusel
const peliculasCarruselEjemplo: Pelicula[] = [
  {
    id: 1,
    title: "El secreto de sus ojos",
    year: 2009,
    synopsis: "Un oficial judicial retirado escribe una novela sobre un caso sin resolver que lo obsesiona desde hace décadas.",
    genre: ["Drama", "Thriller"],
    director: "Juan José Campanella"
  },
  {
    id: 2,
    title: "Relatos salvajes",
    year: 2014,
    synopsis: "Seis relatos que alternan la intriga, la comedia y la violencia. Sus personajes se verán empujados hacia el abismo y hacia el innegable placer de perder el control.",
    genre: ["Comedia", "Drama"],
    director: "Damián Szifron"
  },
  {
    id: 3,
    title: "Nueve reinas",
    year: 2000,
    synopsis: "Dos estafadores de poca monta se ven involucrados en un negocio millonario que los supera.",
    genre: ["Crimen", "Thriller"],
    director: "Fabián Bielinsky"
  }
]

export default function Home() {
  // Estados
  const [peliculasPopulares, setPeliculasPopulares] = useState<Pelicula[]>([])
  const [peliculasNuevas, setPeliculasNuevas] = useState<Pelicula[]>([])
  const [peliculasCarrusel, setPeliculasCarrusel] = useState<Pelicula[]>(peliculasCarruselEjemplo)
  const [peliculasPorDecada, setPeliculasPorDecada] = useState<{[key: string]: Pelicula[]}>({})
  const [peliculasPorGenero, setPeliculasPorGenero] = useState<{[key: string]: Pelicula[]}>({})
  const [topPeliculas, setTopPeliculas] = useState<Pelicula[]>([])
  const [personasDestacadas, setPersonasDestacadas] = useState<Persona[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [imagenesCargadas, setImagenesCargadas] = useState<{[key: number]: string}>({})
  const [decadaExpandida, setDecadaExpandida] = useState<string | null>(null)
  const [generoExpandido, setGeneroExpandido] = useState<string | null>(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtros, setFiltros] = useState({
    genero: '',
    decada: '',
    ordenar: 'popularidad'
  })

  // Funciones de carga de datos
  const cargarPeliculasPopulares = async () => {
    try {
      const response = await fetch('/api/peliculas/populares')
      if (response.ok) {
        const data = await response.json()
        setPeliculasPopulares(data.slice(0, 12))
      }
    } catch (error) {
      console.error('Error cargando películas populares:', error)
    }
  }

  const cargarPeliculasNuevas = async () => {
    try {
      const response = await fetch('/api/peliculas/nuevas')
      if (response.ok) {
        const data = await response.json()
        setPeliculasNuevas(data.slice(0, 12))
      }
    } catch (error) {
      console.error('Error cargando películas nuevas:', error)
    }
  }

  const cargarPeliculasPorDecada = async () => {
    const decadas = ['2020', '2010', '2000', '1990', '1980', '1970', '1960']
    const peliculasPorDecadaTemp: {[key: string]: Pelicula[]} = {}
    
    for (const decada of decadas) {
      try {
        const response = await fetch(`/api/peliculas/decada/${decada}`)
        if (response.ok) {
          const data = await response.json()
          peliculasPorDecadaTemp[decada] = data.slice(0, 6)
        }
      } catch (error) {
        console.error(`Error cargando películas de ${decada}:`, error)
      }
    }
    
    setPeliculasPorDecada(peliculasPorDecadaTemp)
  }

  const cargarPeliculasPorGenero = async () => {
    const generos = ['Drama', 'Comedia', 'Thriller', 'Documental', 'Terror', 'Romance']
    const peliculasPorGeneroTemp: {[key: string]: Pelicula[]} = {}
    
    for (const genero of generos) {
      try {
        const response = await fetch(`/api/peliculas/genero/${genero.toLowerCase()}`)
        if (response.ok) {
          const data = await response.json()
          peliculasPorGeneroTemp[genero] = data.slice(0, 6)
        }
      } catch (error) {
        console.error(`Error cargando películas de ${genero}:`, error)
      }
    }
    
    setPeliculasPorGenero(peliculasPorGeneroTemp)
  }

  const cargarTopPeliculas = async () => {
    try {
      const response = await fetch('/api/peliculas/top')
      if (response.ok) {
        const data = await response.json()
        setTopPeliculas(data.slice(0, 10))
      }
    } catch (error) {
      console.error('Error cargando top películas:', error)
    }
  }

  const cargarPersonasDestacadas = async () => {
    try {
      const response = await fetch('/api/personas/destacadas')
      if (response.ok) {
        const data = await response.json()
        setPersonasDestacadas(data.slice(0, 12))
      }
    } catch (error) {
      console.error('Error cargando personas destacadas:', error)
    }
  }

  const cargarImagen = async (movieId: number) => {
    try {
      const response = await fetch(`/api/images/${movieId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          setImagenesCargadas(prev => ({ ...prev, [movieId]: data.url }))
        }
      }
    } catch (error) {
      console.error(`Error cargando imagen para película ${movieId}:`, error)
    }
  }

  // Effects
  useEffect(() => {
    cargarPeliculasPopulares()
    cargarPeliculasNuevas()
    cargarPeliculasPorDecada()
    cargarPeliculasPorGenero()
    cargarTopPeliculas()
    cargarPersonasDestacadas()
  }, [])

  useEffect(() => {
    const todasLasPeliculas = [
      ...peliculasCarrusel,
      ...peliculasPopulares,
      ...peliculasNuevas,
      ...topPeliculas,
      ...Object.values(peliculasPorDecada).flat(),
      ...Object.values(peliculasPorGenero).flat()
    ]
    
    const peliculasUnicas = Array.from(new Set(todasLasPeliculas.map(p => p.id)))
    peliculasUnicas.forEach(id => {
      if (!imagenesCargadas[id]) {
        cargarImagen(id)
      }
    })
  }, [peliculasCarrusel, peliculasPopulares, peliculasNuevas, topPeliculas, peliculasPorDecada, peliculasPorGenero, imagenesCargadas])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % peliculasCarrusel.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [peliculasCarrusel.length])

  // Funciones de navegación
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % peliculasCarrusel.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + peliculasCarrusel.length) % peliculasCarrusel.length)
  }

  const aplicarFiltros = () => {
    console.log('Aplicando filtros:', filtros)
    setMostrarFiltros(false)
  }

  // Componente de tarjeta de película
  const MovieCard = ({ pelicula }: { pelicula: Pelicula }) => (
    <Link href={`/pelicula/${pelicula.id}`} className="group">
      <div className="relative aspect-[2/3] bg-[#273038] rounded overflow-hidden mb-2 shadow-lg group-hover:shadow-xl transition-shadow">
        {imagenesCargadas[pelicula.id] ? (
          <Image
            src={imagenesCargadas[pelicula.id]}
            alt={pelicula.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#456]">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-sm text-white group-hover:text-[#00e054] transition-colors line-clamp-2">
        {pelicula.title}
      </h3>
      <p className="text-xs text-[#678]">{pelicula.year}</p>
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#14181c] text-[#9ab]">
      {/* Sección Hero con Carrusel */}
      <section className="relative h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/60 to-transparent z-10" />
        
        {peliculasCarrusel.length > 0 && (
          <>
            <div className="absolute inset-0">
              {imagenesCargadas[peliculasCarrusel[currentSlide].id] ? (
                <Image
                  src={imagenesCargadas[peliculasCarrusel[currentSlide].id]}
                  alt={peliculasCarrusel[currentSlide].title}
                  fill
                  className="object-cover opacity-40"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-[#273038]" />
              )}
            </div>

            <div className="relative z-20 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 w-full">
                <div className="max-w-2xl">
                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                    {peliculasCarrusel[currentSlide].title}
                  </h1>
                  <p className="text-xl text-[#9ab] mb-6">
                    {peliculasCarrusel[currentSlide].year} • 
                    {peliculasCarrusel[currentSlide].genre?.join(', ')}
                  </p>
                  <p className="text-[#9ab] mb-8 line-clamp-3">
                    {peliculasCarrusel[currentSlide].synopsis}
                  </p>
                  <Link
                    href={`/pelicula/${peliculasCarrusel[currentSlide].id}`}
                    className="bg-[#00e054] text-[#14181c] px-6 py-3 rounded font-semibold hover:bg-[#00c846] transition-colors inline-block"
                  >
                    Ver más
                  </Link>
                </div>
              </div>
            </div>

            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 p-3 rounded-full hover:bg-black/70 transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 p-3 rounded-full hover:bg-black/70 transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {peliculasCarrusel.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-[#00e054] w-8' : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Búsqueda Rápida */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#273038] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Búsqueda Rápida</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/peliculas?decada=2020" className="bg-[#1c2228] p-4 rounded hover:bg-[#384148] transition-colors text-center">
              <span className="text-[#00e054] text-2xl font-bold">2020s</span>
              <p className="text-sm text-[#678] mt-1">Lo más reciente</p>
            </Link>
            <Link href="/peliculas?genero=drama" className="bg-[#1c2228] p-4 rounded hover:bg-[#384148] transition-colors text-center">
              <span className="text-[#00e054] text-2xl font-bold">Drama</span>
              <p className="text-sm text-[#678] mt-1">Historias profundas</p>
            </Link>
            <Link href="/peliculas?premio=oscar" className="bg-[#1c2228] p-4 rounded hover:bg-[#384148] transition-colors text-center">
              <span className="text-[#00e054] text-2xl font-bold">Premiadas</span>
              <p className="text-sm text-[#678] mt-1">Ganadoras de premios</p>
            </Link>
            <Link href="/personas" className="bg-[#1c2228] p-4 rounded hover:bg-[#384148] transition-colors text-center">
              <span className="text-[#00e054] text-2xl font-bold">Personas</span>
              <p className="text-sm text-[#678] mt-1">Actores y directores</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Películas Populares */}
      {peliculasPopulares.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Películas Populares</h2>
            <Link href="/peliculas?sort=popular" className="text-[#00e054] hover:text-[#00c846] text-sm transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {peliculasPopulares.map((pelicula) => (
              <MovieCard key={pelicula.id} pelicula={pelicula} />
            ))}
          </div>
        </section>
      )}

      {/* Nuevas Películas */}
      {peliculasNuevas.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Agregadas Recientemente</h2>
            <Link href="/peliculas?sort=newest" className="text-[#00e054] hover:text-[#00c846] text-sm transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {peliculasNuevas.map((pelicula) => (
              <MovieCard key={pelicula.id} pelicula={pelicula} />
            ))}
          </div>
        </section>
      )}

      {/* Búsqueda por Década */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-white mb-6">Explorar por Década</h2>
        <div className="space-y-6">
          {Object.entries(peliculasPorDecada).map(([decada, peliculas]) => (
            <div key={decada} className="bg-[#1c2228] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl text-white font-semibold">{decada}s</h3>
                <button
                  onClick={() => setDecadaExpandida(decadaExpandida === decada ? null : decada)}
                  className="text-[#00e054] hover:text-[#00c846] transition-colors"
                >
                  {decadaExpandida === decada ? 'Ver menos' : 'Ver más'}
                </button>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 ${decadaExpandida !== decada ? 'max-h-[300px] overflow-hidden' : ''}`}>
                {peliculas.map((pelicula) => (
                  <MovieCard key={pelicula.id} pelicula={pelicula} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Búsqueda por Género */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-white mb-6">Explorar por Género</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(peliculasPorGenero).map(([genero, peliculas]) => (
            <div key={genero} className="bg-[#1c2228] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl text-white font-semibold">{genero}</h3>
                <Link href={`/peliculas?genero=${genero.toLowerCase()}`} className="text-[#00e054] hover:text-[#00c846] text-sm transition-colors">
                  Ver todas →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {peliculas.slice(0, 3).map((pelicula) => (
                  <MovieCard key={pelicula.id} pelicula={pelicula} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top 10 Películas */}
      {topPeliculas.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Top 10 Películas</h2>
          <div className="bg-[#1c2228] rounded-lg p-6">
            <ol className="space-y-4">
              {topPeliculas.map((pelicula, index) => (
                <li key={pelicula.id} className="flex items-center gap-4 p-4 bg-[#273038] rounded hover:bg-[#384148] transition-colors">
                  <span className="text-3xl font-bold text-[#00e054] w-12 text-center">{index + 1}</span>
                  <div className="w-16 h-24 bg-[#384148] rounded flex-shrink-0">
                    {imagenesCargadas[pelicula.id] && (
                      <Image
                        src={imagenesCargadas[pelicula.id]}
                        alt={pelicula.title}
                        width={64}
                        height={96}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link href={`/pelicula/${pelicula.id}`} className="text-white hover:text-[#00e054] font-semibold transition-colors">
                      {pelicula.title}
                    </Link>
                    <p className="text-sm text-[#678]">{pelicula.year} • {pelicula.director}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Personas Destacadas */}
      {personasDestacadas.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Personas Destacadas</h2>
            <Link href="/personas" className="text-[#00e054] hover:text-[#00c846] text-sm transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {personasDestacadas.map((persona) => (
              <Link key={persona.id} href={`/persona/${persona.id}`} className="group text-center">
                <div className="w-full aspect-square bg-[#273038] rounded-full mb-3 overflow-hidden group-hover:ring-4 group-hover:ring-[#00e054] transition-all">
                  {persona.image ? (
                    <Image
                      src={persona.image}
                      alt={persona.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#456]">
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-sm text-white group-hover:text-[#00e054] transition-colors font-medium">
                  {persona.name}
                </h3>
                <p className="text-xs text-[#678]">{persona.roles.join(', ')}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Estadísticas */}
      <section className="bg-[#0c0f12] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-white mb-8 text-center">CineNacional en Números</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#00e054]">2,500+</div>
              <div className="text-sm text-[#678] mt-2">Películas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00e054]">10,000+</div>
              <div className="text-sm text-[#678] mt-2">Personas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00e054]">90+</div>
              <div className="text-sm text-[#678] mt-2">Años de historia</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00e054]">1,000+</div>
              <div className="text-sm text-[#678] mt-2">Premios documentados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de Filtros */}
      {mostrarFiltros && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c2228] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Filtrar Películas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9ab] mb-2">Género</label>
                <select
                  value={filtros.genero}
                  onChange={(e) => setFiltros({...filtros, genero: e.target.value})}
                  className="w-full bg-[#273038] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00e054]"
                >
                  <option value="">Todos</option>
                  <option value="drama">Drama</option>
                  <option value="comedia">Comedia</option>
                  <option value="thriller">Thriller</option>
                  <option value="documental">Documental</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ab] mb-2">Década</label>
                <select
                  value={filtros.decada}
                  onChange={(e) => setFiltros({...filtros, decada: e.target.value})}
                  className="w-full bg-[#273038] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00e054]"
                >
                  <option value="">Todas</option>
                  <option value="2020">2020s</option>
                  <option value="2010">2010s</option>
                  <option value="2000">2000s</option>
                  <option value="1990">1990s</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ab] mb-2">Ordenar por</label>
                <select
                  value={filtros.ordenar}
                  onChange={(e) => setFiltros({...filtros, ordenar: e.target.value})}
                  className="w-full bg-[#273038] text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00e054]"
                >
                  <option value="popularidad">Popularidad</option>
                  <option value="fecha">Más recientes</option>
                  <option value="calificacion">Mejor calificadas</option>
                  <option value="alfabetico">Alfabético</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={aplicarFiltros}
                className="flex-1 bg-[#00e054] text-[#14181c] py-2 rounded font-semibold hover:bg-[#00c846] transition-colors"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="flex-1 bg-[#273038] text-white py-2 rounded font-semibold hover:bg-[#384148] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}