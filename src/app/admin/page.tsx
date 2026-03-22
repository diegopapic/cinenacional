import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/admin/stats" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Estadísticas</h2>
          <p className="text-gray-600">Ver visitas y popularidad</p>
        </Link>

        <Link href="/admin/movies" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Películas</h2>
          <p className="text-gray-600">Gestionar películas</p>
        </Link>

        <Link href="/admin/people" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Personas</h2>
          <p className="text-gray-600">Gestionar personas</p>
        </Link>

        <Link href="/admin/genres" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Géneros</h2>
          <p className="text-gray-600">Gestionar géneros</p>
        </Link>

        <Link href="/admin/locations" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Ubicaciones</h2>
          <p className="text-gray-600">Gestionar ubicaciones</p>
        </Link>

        <Link href="/admin/themes" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Temas</h2>
          <p className="text-gray-600">Gestionar temas</p>
        </Link>

        <Link href="/admin/roles" className="p-6 bg-white rounded-lg shadow-sm hover:shadow-lg">
          <h2 className="text-xl font-semibold">Roles</h2>
          <p className="text-gray-600">Gestionar roles</p>
        </Link>
      </div>
    </div>
  )
}
