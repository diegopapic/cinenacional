import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sobre nosotros — cinenacional.com',
  description: 'cinenacional.com es el registro más completo y confiable de cine argentino en la web. Nacimos en 2001 y hoy somos el sitio de referencia del cine argentino.',
  alternates: { canonical: 'https://cinenacional.com/sobre-nosotros' },
}

export default function SobreNosotrosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Sobre nosotros
      </h1>

      <div className="mt-8 space-y-5 text-[14px] leading-relaxed text-foreground/80 md:text-[15px]">
        <p>
          Cinenacional.com es el registro más completo y confiable de cine argentino en la web.
          Nacimos en 2001, cuando internet era otra cosa, el cine argentino era otro y el país
          también. Desde entonces crecimos sin parar y hoy somos el sitio de referencia para quien
          quiera saber algo sobre una película, un director o un actor del cine argentino.
        </p>

        <p>
          A diferencia de bases de datos generalistas como IMDb, TMDb o Letterboxd, nos dedicamos
          exclusivamente al cine argentino. Eso nos permite actualizar la información con más
          detalle y más rapidez que cualquier otra fuente disponible.
        </p>

        <p>
          Cubrimos todas las épocas: desde <em>La bandera argentina</em>, de Eugenio Py (1897),
          hasta los estrenos del año en curso. Incluimos largometrajes, mediometrajes y
          cortometrajes de ficción, documental y animación.
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
          <li>12.531 películas</li>
          <li>81.389 personas</li>
          <li>14.149 efemérides</li>
          <li>7.707 afiches</li>
          <li>10.620 retratos</li>
          <li>8.514 imágenes</li>
          <li>1.920 tráilers</li>
        </ul>

        <p>
          El sitio es una creación personal de Diego Papic, periodista y crítico de cine argentino.
          Trabajó en Clarín Espectáculos y La Agenda, y actualmente es editor de la
          revista Seúl. Cinenacional.com no es un organismo oficial ni está afiliado al INCAA ni a
          ninguna institución del Estado.
        </p>

        <p>
          Si encontrás un error o querés colaborar con
          información, <Link href="/contacto" className="text-foreground/80 hover:text-accent transition-colors">escribinos</Link>.
          Esta base de datos se construye con tiempo, cuidado y, a veces, con la ayuda de lectores.
        </p>
      </div>
    </div>
  )
}
