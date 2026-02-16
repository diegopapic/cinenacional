// src/app/components/layout/Footer.tsx
import Link from 'next/link'
import { X, Mail } from 'lucide-react'
import Image from 'next/image'
import { FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  // const footerLinks = {
  //   explore: [
  //     { href: '/peliculas', label: 'Todas las Películas' },
  //     { href: '/personas', label: 'Directores y Actores' },
  //     { href: '/generos', label: 'Explorar por Género' },
  //     { href: '/anos', label: 'Películas por Año' },
  //   ],
  //   about: [
  //     { href: '/sobre-nosotros', label: 'Sobre cinenacional.com' },
  //     { href: '/contacto', label: 'Contacto' },
  //     { href: '/api', label: 'API para Desarrolladores' },
  //     { href: '/colaborar', label: 'Cómo Colaborar' },
  //   ],
  //   legal: [
  //     { href: '/terminos', label: 'Términos de Uso' },
  //     { href: '/privacidad', label: 'Política de Privacidad' },
  //     { href: '/copyright', label: 'Derechos de Autor' },
  //   ],
  // }

  return (
    <footer className="bg-nav border-t border-[oklch(0.28_0.005_250)] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-4 text-center md:text-left">
            <Link href="/" className="flex items-center space-x-2 text-white mb-4 justify-center md:justify-start">
              <Image
                src="/images/logo.svg"
                alt="cinenacional.com"
                width={180}
                height={40}
                className="h-10 sm:h-12 w-auto"
                priority
              />
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              La base de datos más completa del cine argentino.
            </p>
            <div className="flex space-x-4 justify-center md:justify-start">
              <a href="https://x.com/cinenacional" className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/cinenacional" className="text-gray-400 hover:text-white transition-colors">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="mailto:info@cinenacional.com" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Explore Links */}
          {/* <div>
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
          </div> */}

          {/* About Links */}
          {/* <div>
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
          </div> */}

          {/* Legal Links */}
          {/* <div>
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
          </div> */}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[oklch(0.28_0.005_250)] mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} cinenacional.com. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}   