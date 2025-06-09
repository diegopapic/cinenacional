
// src/app/page.tsx
import Link from 'next/link'


export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">
          Bienvenido a CineNacional
        </h2>
        
        <p className="text-lg text-gray-700 mb-8">
          La base de datos más completa del cine argentino
        </p>

        {/* Películas destacadas (placeholder) */}
        <section>
          <h3 className="text-2xl font-semibold mb-4">
            Películas Destacadas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Película de ejemplo */}
            <article className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-64 bg-gray-300"></div>
              <div className="p-4">
                <h4 className="font-semibold text-lg mb-2">
                  <Link 
                    href="/peliculas/el-secreto-de-sus-ojos" 
                    className="text-blue-600 hover:text-blue-800"
                  >
                    El secreto de sus ojos
                  </Link>
                </h4>
                <p className="text-gray-600">2009 • Drama, Thriller</p>
                <p className="text-sm text-gray-500 mt-2">
                  Dir: Juan José Campanella
                </p>
              </div>
            </article>

            {/* Más películas placeholder */}
            <article className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-64 bg-gray-300"></div>
              <div className="p-4">
                <h4 className="text-blue-600 hover:text-blue-800">
                  Nueve reinas
                </h4>
                <p className="text-gray-600">2000 • Thriller, Crimen</p>
                <p className="text-sm text-gray-500 mt-2">
                  Dir: Fabián Bielinsky
                </p>
              </div>
            </article>

            <article className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-64 bg-gray-300"></div>
              <div className="p-4">
                <h4 className="text-blue-600 hover:text-blue-800">
                  Relatos salvajes
                </h4>
                <p className="text-gray-600">2014 • Comedia negra</p>
                <p className="text-sm text-gray-500 mt-2">
                  Dir: Damián Szifron
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>

     
    </div>
  )
}
