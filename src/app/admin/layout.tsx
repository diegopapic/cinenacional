// src/app/admin/layout.tsx
'use client'

import Link from 'next/link'
import { 
  Film, 
  Users, 
  Building2, 
  Award, 
  Globe, 
  Languages, 
  Home,
  Menu,
  X,
  Tag,
  Hash
} from 'lucide-react'
import { ReactNode, useState } from 'react'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Películas', href: '/admin/movies', icon: Film },
    { name: 'Personas', href: '/admin/people', icon: Users },
    { name: 'Géneros', href: '/admin/genres', icon: Hash },
    { name: 'Productoras', href: '/admin/companies/production', icon: Building2 },
    { name: 'Distribuidoras', href: '/admin/companies/distribution', icon: Building2 },
    { name: 'Premios', href: '/admin/awards', icon: Award },
    { name: 'Países', href: '/admin/countries', icon: Globe },
    { name: 'Idiomas', href: '/admin/languages', icon: Languages },
    { name: 'Temas', href: '/admin/themes', icon: Tag },
    { name: 'Calificaciones', href: '/admin/calificaciones', icon: Tag }
  ]

  return (
    <div className="min-h-screen bg-gray-100" data-admin="true">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-64 bg-white">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">CineNacional Admin</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <nav className="flex-1 flex flex-col bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">CineNacional Admin</h2>
          </div>
          <div className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                {item.name}
              </Link>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700"
            >
              Volver al sitio
            </Link>
          </div>
        </nav>
      </div>

      {/* Contenido principal */}
      <div className="md:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-10 md:hidden bg-white shadow">
          <div className="px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <main className="text-gray-900">{children}</main>
      </div>
    </div>
  )
}