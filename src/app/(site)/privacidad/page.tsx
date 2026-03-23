import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad — cinenacional.com',
  description: 'Política de privacidad y protección de datos personales de cinenacional.com.',
  alternates: { canonical: 'https://cinenacional.com/privacidad' },
}

export default function PrivacidadPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Política de privacidad
      </h1>
      <p className="mt-2 text-[13px] text-muted-foreground/50">
        Última actualización: marzo de 2026
      </p>

      <div className="prose prose-invert prose-sm mt-8 max-w-none text-foreground/80 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-foreground/90 [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:no-underline">
        <h2>1. Información que recopilamos</h2>
        <p>
          cinenacional.com no requiere registro de usuarios para acceder al contenido público.
          La información que recopilamos se limita a:
        </p>
        <ul>
          <li>
            <strong>Datos de navegación:</strong> dirección IP (almacenada de forma anonimizada
            mediante hash), páginas visitadas, fecha y hora de acceso, tipo de navegador y
            dispositivo. Estos datos se recopilan con fines estadísticos.
          </li>
          <li>
            <strong>Cookies técnicas:</strong> utilizamos cookies estrictamente necesarias para el
            funcionamiento del sitio, incluyendo tokens de seguridad (CSRF) para proteger contra
            solicitudes maliciosas. Estas cookies no rastrean tu actividad en otros sitios.
          </li>
        </ul>

        <h2>2. Google Analytics</h2>
        <p>
          Utilizamos Google Analytics (GA4) para comprender cómo los visitantes interactúan con el
          Sitio. Google Analytics recopila información de forma anónima, incluyendo páginas visitadas,
          tiempo de permanencia y datos demográficos generales. Esta información nos ayuda a mejorar
          el contenido y la experiencia de navegación.
        </p>
        <p>
          Google Analytics utiliza cookies propias. Podés obtener más información sobre cómo Google
          gestiona los datos en
          su <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">política de privacidad</a> y
          desactivar el seguimiento instalando
          el <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">complemento de inhabilitación de Google Analytics</a>.
        </p>

        <h2>3. Cómo usamos la información</h2>
        <p>La información recopilada se utiliza exclusivamente para:</p>
        <ul>
          <li>Generar estadísticas internas de uso del Sitio.</li>
          <li>Mejorar el contenido y la funcionalidad del Sitio.</li>
          <li>Garantizar la seguridad y el correcto funcionamiento del servicio.</li>
        </ul>
        <p>
          No vendemos, compartimos ni cedemos datos personales a terceros con fines comerciales.
        </p>

        <h2>4. Almacenamiento y seguridad</h2>
        <p>
          Las direcciones IP se almacenan exclusivamente en formato hash (anonimizado), lo que impide
          la identificación directa de los visitantes. Implementamos medidas de seguridad técnicas
          incluyendo HTTPS, Content Security Policy (CSP), protección CSRF y limitación de solicitudes
          (rate limiting).
        </p>

        <h2>5. Servicios de terceros</h2>
        <p>El Sitio utiliza los siguientes servicios de terceros:</p>
        <ul>
          <li>
            <strong>Google Analytics:</strong> análisis de tráfico web (ver sección 2).
          </li>
          <li>
            <strong>Cloudinary:</strong> alojamiento y optimización de imágenes. Las imágenes se
            sirven desde los servidores de Cloudinary.
          </li>
        </ul>
        <p>
          Cada uno de estos servicios tiene su propia política de privacidad que regula el
          tratamiento de datos en sus plataformas.
        </p>

        <h2>6. Derechos del usuario</h2>
        <p>
          De acuerdo con la Ley de Protección de Datos Personales (Ley 25.326 de Argentina), tenés
          derecho a:
        </p>
        <ul>
          <li>Acceder a la información que tengamos sobre vos.</li>
          <li>Solicitar la rectificación o eliminación de tus datos.</li>
          <li>Oponerte al tratamiento de tus datos.</li>
        </ul>
        <p>
          Dado que no recopilamos datos personales identificables de los visitantes del Sitio, estos
          derechos aplican principalmente a personas cuya información biográfica o profesional aparece
          publicada en el Sitio. Si sos una de esas personas y querés ejercer alguno de estos
          derechos, contactanos.
        </p>

        <h2>7. Menores de edad</h2>
        <p>
          El Sitio no está dirigido a menores de 13 años ni recopila intencionalmente información
          de menores.
        </p>

        <h2>8. Cambios en esta política</h2>
        <p>
          Podemos actualizar esta política de privacidad periódicamente. Los cambios se publicarán
          en esta página con la fecha de última actualización.
        </p>

        <h2>9. Contacto</h2>
        <p>
          Para consultas sobre privacidad o protección de datos, podés escribirnos
          a <a href="mailto:info@cinenacional.com" className="text-foreground hover:text-accent transition-colors">info@cinenacional.com</a>.
        </p>
      </div>
    </div>
  )
}
