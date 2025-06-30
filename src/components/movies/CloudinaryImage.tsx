// src/components/movies/CloudinaryImage.tsx
'use client'

import { CldImage } from 'next-cloudinary'
import { useState } from 'react'

interface CloudinaryImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className
}: CloudinaryImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // Si no hay src, mostrar placeholder
  if (!src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Sin imagen</span>
      </div>
    )
  }

  // Si hay error, mostrar placeholder
  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Error al cargar imagen</span>
      </div>
    )
  }

  // Para imágenes que no son de Cloudinary, usar img normal
  if (!src.includes('cloudinary')) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setError(true)}
      />
    )
  }

  // Extraer public_id de la URL de Cloudinary
  const publicId = src.split('/upload/')[1]?.split('.')[0] || src

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`} />
      )}
      <CldImage
        width={width}
        height={height}
        src={publicId}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={className}
        crop="fill"
        gravity="auto"
        format="auto"
        quality="auto"
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  )
}