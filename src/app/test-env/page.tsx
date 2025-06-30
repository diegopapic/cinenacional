// src/app/test-env/page.tsx
export default function TestEnv() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Variables de Cloudinary</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify({
          CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'NO DEFINIDO',
          API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? 'DEFINIDO' : 'NO DEFINIDO',
          HAS_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SI' : 'NO'
        }, null, 2)}
      </pre>
    </div>
  )
}