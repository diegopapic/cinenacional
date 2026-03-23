import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Sobre nosotros — cinenacional.com',
  description: 'cinenacional.com es el registro más completo y confiable de cine argentino en la web. Nacimos en 2001 y hoy somos el sitio de referencia del cine argentino.',
  alternates: { canonical: 'https://cinenacional.com/sobre-nosotros' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 3600

async function getStats() {
  const [peliculas, personas, afiches, fotos, imagenes, trailers, efemeridesResult] =
    await Promise.all([
      prisma.movie.count(),
      prisma.person.count(),
      prisma.movie.count({
        where: { posterUrl: { not: null }, NOT: { posterUrl: '' } },
      }),
      prisma.person.count({
        where: { photoUrl: { not: null }, NOT: { photoUrl: '' } },
      }),
      prisma.image.count(),
      prisma.movie.count({
        where: { trailerUrl: { not: null }, NOT: { trailerUrl: '' } },
      }),
      prisma.$queryRaw<[{ total: bigint }]>`
        WITH counts AS (
          SELECT
            COUNT(*) FILTER (WHERE release_year IS NOT NULL AND release_month IS NOT NULL AND release_day IS NOT NULL) as peliculas_estreno,
            COUNT(*) FILTER (WHERE filming_start_year IS NOT NULL AND filming_start_month IS NOT NULL AND filming_start_day IS NOT NULL) as peliculas_inicio_rodaje,
            COUNT(*) FILTER (WHERE filming_end_year IS NOT NULL AND filming_end_month IS NOT NULL AND filming_end_day IS NOT NULL) as peliculas_fin_rodaje
          FROM movies
        ),
        people_counts AS (
          SELECT
            COUNT(*) FILTER (WHERE birth_year IS NOT NULL AND birth_month IS NOT NULL AND birth_day IS NOT NULL) as personas_nacimiento,
            COUNT(*) FILTER (WHERE death_year IS NOT NULL AND death_month IS NOT NULL AND death_day IS NOT NULL) as personas_muerte
          FROM people
        )
        SELECT (c.peliculas_estreno + c.peliculas_inicio_rodaje + c.peliculas_fin_rodaje +
                p.personas_nacimiento + p.personas_muerte) as total
        FROM counts c, people_counts p
      `,
    ])

  const efemerides = Number(efemeridesResult[0]?.total || 0)

  return { peliculas, personas, efemerides, afiches, fotos, imagenes, trailers }
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

export default async function SobreNosotrosPage() {
  const stats = await getStats()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Sobre nosotros
      </h1>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground/80 md:text-[15px]">
        <p>
          <strong className="font-semibold text-foreground">cinenacional.com</strong> es el registro más completo y confiable de cine
          argentino en la web. Nacimos en 2001, cuando todo era diferente: internet, el cine
          argentino, el país. Desde entonces crecimos sin parar y hoy somos el sitio de referencia
          para quien quiera saber algo sobre una película, un director, un actor o cualquier
          técnico, desde el jefe de producción hasta el último meritorio de vestuario.
        </p>

        <p>
          A diferencia de bases de datos generalistas como IMDb, TMDb o Letterboxd, nos dedicamos
          exclusivamente al cine argentino. Eso nos permite actualizar la información con más
          detalle y más rapidez que cualquier otra fuente disponible.
        </p>

        <p>
          Cubrimos todas las épocas:
          desde <Link href="/pelicula/la-bandera-argentina" className="text-foreground hover:text-accent transition-colors">La bandera argentina</Link>,
          de <Link href="/persona/eugenio-py" className="text-foreground hover:text-accent transition-colors">Eugenio Py</Link> (1897),
          hasta los próximos estrenos. Incluimos largometrajes, mediometrajes y cortometrajes de
          ficción, documental y animación.
        </p>

        <p>
          Cada ficha reúne sinopsis, ficha técnica completa, ficha artística, calificación,
          duración, géneros, países de coproducción, afiche, fotogramas, tráiler, fecha y lugar de
          estreno, y links a medios con críticas.
        </p>

        <p className="font-medium text-foreground/90">
          Hoy la base cuenta con:
        </p>

        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-foreground/70">
          <li>{fmt(stats.peliculas)} películas</li>
          <li>{fmt(stats.personas)} personas</li>
          <li>{fmt(stats.efemerides)} efemérides</li>
          <li>{fmt(stats.afiches)} afiches</li>
          <li>{fmt(stats.fotos)} retratos</li>
          <li>{fmt(stats.imagenes)} imágenes</li>
          <li>{fmt(stats.trailers)} tráilers</li>
        </ul>

        <p>
          El sitio es una creación personal de Diego Papic, periodista y crítico de cine argentino.
          Trabajó en <em>Clarín Espectáculos</em> y <em>La Agenda</em>, y actualmente es editor de
          la revista <em>Seúl</em>. <strong className="font-semibold text-foreground">cinenacional.com</strong> no es un organismo oficial ni
          está afiliado al INCAA ni a ninguna institución del Estado.
        </p>

        <p>
          Si encontrás un error o querés colaborar con
          información, <Link href="/contacto" className="text-foreground hover:text-accent transition-colors">escribinos</Link>.
          Esta base de datos se construye con tiempo, cuidado y, a veces, con la ayuda de lectores.
        </p>
      </div>
    </div>
  )
}
