// src/app/components/layout/Footer.tsx
import Link from 'next/link'
import { Film, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    explore: [
      { href: '/peliculas', label: 'Todas las Películas' },
      { href: '/personas', label: 'Directores y Actores' },
      { href: '/generos', label: 'Explorar por Género' },
      { href: '/anos', label: 'Películas por Año' },
    ],
    about: [
      { href: '/sobre-nosotros', label: 'Sobre CineNacional' },
      { href: '/contacto', label: 'Contacto' },
      { href: '/api', label: 'API para Desarrolladores' },
      { href: '/colaborar', label: 'Cómo Colaborar' },
    ],
    legal: [
      { href: '/terminos', label: 'Términos de Uso' },
      { href: '/privacidad', label: 'Política de Privacidad' },
      { href: '/copyright', label: 'Derechos de Autor' },
    ],
  }

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center space-x-2 text-white mb-4">
              <Film className="w-8 h-8" />
              <span className="font-bold text-xl">CineNacional</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              La base de datos más completa del cine argentino. 
              Preservando nuestra historia cinematográfica.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="mailto:info@cinenacional.com" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Explorar</h3>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Información</h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} CineNacional. Todos los derechos reservados.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Hecho con ❤️ para el cine argentino
          </p>
        </div>
      </div>
    </footer>
  )
}