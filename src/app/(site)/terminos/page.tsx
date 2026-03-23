import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de uso — cinenacional.com',
  description: 'Términos y condiciones de uso del sitio cinenacional.com.',
  alternates: { canonical: 'https://cinenacional.com/terminos' },
}

export default function TerminosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Términos de uso
      </h1>
      <p className="mt-2 text-[13px] text-muted-foreground/50">
        Última actualización: marzo de 2026
      </p>

      <div className="prose prose-invert prose-sm mt-8 max-w-none text-foreground/80 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-foreground/90 [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:no-underline">
        <h2>1. Aceptación de los términos</h2>
        <p>
          Al acceder y utilizar cinenacional.com (en adelante, &ldquo;el Sitio&rdquo;), aceptás estos
          términos de uso en su totalidad. Si no estás de acuerdo con alguno de ellos, te pedimos
          que no utilices el Sitio.
        </p>

        <h2>2. Descripción del servicio</h2>
        <p>
          cinenacional.com es una base de datos del cine argentino que ofrece información sobre
          películas, personas (actores, directores, técnicos), estrenos, festivales y otros datos
          relacionados con la cinematografía de Argentina. El acceso al contenido público del Sitio
          es gratuito y no requiere registro.
        </p>

        <h2>3. Propiedad intelectual</h2>
        <p>
          El diseño, la estructura, la selección y disposición de los contenidos del Sitio son
          propiedad de cinenacional.com. Las imágenes de películas, fotografías de personas y
          materiales audiovisuales pertenecen a sus respectivos titulares de derechos y se utilizan
          con fines informativos y de archivo.
        </p>
        <p>
          Queda prohibida la reproducción, distribución o modificación total o parcial del contenido
          del Sitio sin autorización previa, salvo para uso personal y no comercial.
        </p>

        <h2>4. Exactitud de la información</h2>
        <p>
          cinenacional.com se esfuerza por mantener la información actualizada y precisa. Sin
          embargo, no garantizamos que todos los datos sean completos o estén libres de errores. Si
          encontrás información incorrecta, podés contactarnos para que la corrijamos.
        </p>

        <h2>5. Uso aceptable</h2>
        <p>Al utilizar el Sitio, te comprometés a:</p>
        <ul>
          <li>No realizar scraping masivo ni automatizado del contenido sin autorización.</li>
          <li>No intentar acceder a áreas restringidas del Sitio.</li>
          <li>No utilizar el Sitio para actividades ilegales o que perjudiquen a terceros.</li>
          <li>No sobrecargar los servidores con solicitudes excesivas.</li>
        </ul>

        <h2>6. Enlaces a terceros</h2>
        <p>
          El Sitio puede contener enlaces a sitios externos (IMDb, YouTube, redes sociales, etc.).
          cinenacional.com no es responsable del contenido ni de las políticas de privacidad de
          dichos sitios.
        </p>

        <h2>7. Limitación de responsabilidad</h2>
        <p>
          cinenacional.com se proporciona &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;.
          No garantizamos que el servicio sea ininterrumpido ni libre de errores. En ningún caso
          seremos responsables por daños directos o indirectos derivados del uso del Sitio.
        </p>

        <h2>8. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios
          serán efectivos desde su publicación en esta página. El uso continuado del Sitio después
          de cualquier modificación implica la aceptación de los nuevos términos.
        </p>

        <h2>9. Contacto</h2>
        <p>
          Para consultas sobre estos términos, podés escribirnos
          a <a href="mailto:info@cinenacional.com" className="text-foreground/80 hover:text-accent transition-colors">info@cinenacional.com</a>.
        </p>
      </div>
    </div>
  )
}
