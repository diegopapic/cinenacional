// src/components/admin/CloudinaryGallery.tsx
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CloudinaryImage } from '@/components/movies/CloudinaryImage'

interface CloudinaryGalleryProps {
  movieId: number
  images: Array<{
    url: string
    publicId?: string
  }>
  onChange: (images: any[]) => void
}

export function CloudinaryGallery({ movieId, images, onChange }: CloudinaryGalleryProps) {
  const [galleryImages, setGalleryImages] = useState(images)

  const handleUploadSuccess = (result: any) => {
    const newImage = {
      url: result.info.secure_url,
      publicId: result.info.public_id,
      type: 'STILL'
    }
    
    const updated = [...galleryImages, newImage]
    setGalleryImages(updated)
    onChange(updated)
  }

  const handleRemove = (index: number) => {
    const updated = galleryImages.filter((_, i) => i !== index)
    setGalleryImages(updated)
    onChange(updated)
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Galería de Imágenes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {galleryImages.map((image, index) => (
          <div key={index} className="relative group">
            <CloudinaryImage
              src={image.url}
              alt={`Imagen ${index + 1}`}
              width={300}
              height={200}
              className="w-full aspect-video object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        <CldUploadWidget
          uploadPreset="cinenacional-unsigned"
          options={{
            folder: `cinenacional/gallery/${movieId}`,
            sources: ['local', 'url'],
            multiple: true,
            maxFiles: 10
          }}
          onUpload={handleUploadSuccess}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
            >
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto" />
                <span className="text-sm text-gray-500 mt-2 block">
                  Agregar imágenes
                </span>
              </div>
            </button>
          )}
        </CldUploadWidget>
      </div>
    </div>
  )
}