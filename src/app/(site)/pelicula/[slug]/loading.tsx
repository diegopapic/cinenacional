// src/app/pelicula/[slug]/loading.tsx
export default function Loading() {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
        <p className="mt-4 text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}