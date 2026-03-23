// src/app/components/layout/Footer.tsx
import Link from 'next/link'
import { X, Mail, Instagram } from 'lucide-react'
import Image from 'next/image'

const footerLinks = {
  info: [
    { href: '/sobre-nosotros', label: 'Sobre nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ],
  legal: [
    { href: '/terminos', label: 'Términos de uso' },
    { href: '/privacidad', label: 'Política de privacidad' },
  ],
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-nav border-t border-[oklch(0.28_0.005_250)] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 text-center md:text-left">
            <Link href="/" className="flex items-center space-x-2 text-white mb-4 justify-center md:justify-start">
              <Image
                src="/images/logo.svg"
                alt="cinenacional.com"
                width={777}
                height={163}
                className="h-12 sm:h-14 w-auto"
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
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:info@cinenacional.com" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Info Links */}
          <div className="text-center md:text-left">
            <h3 className="text-white font-semibold mb-4 text-sm">Información</h3>
            <ul className="space-y-2">
              {footerLinks.info.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="text-center md:text-left">
            <h3 className="text-white font-semibold mb-4 text-sm">Legal</h3>
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
        <div className="border-t border-[oklch(0.28_0.005_250)] mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} cinenacional.com. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
