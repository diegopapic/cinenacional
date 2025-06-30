// src/components/admin/CloudinaryUploadWidget.tsx
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface CloudinaryUploadWidgetProps {
  value?: string
  onChange: (url: string, publicId?: string) => void
  label: string
  type?: 'poster' | 'backdrop' | 'gallery'
  movieId?: string | number
  disabled?: boolean
}

export function CloudinaryUploadWidget({ 
  value, 
  onChange, 
  label, 
  type = 'poster',
  movieId,
  disabled = false
}: CloudinaryUploadWidgetProps) {
  const [imageUrl, setImageUrl] = useState(value || '')
  
  // Configuración según el tipo de imagen
  const getUploadPreset = () => {
    // Puedes crear estos presets en tu dashboard de Cloudinary
    switch(type) {
      case 'poster':
        return {
          folder: `cinenacional/posters${movieId ? `/${movieId}` : ''}`,
          transformation: [
            { width: 500, height: 750, crop: 'fill', gravity: 'auto' }
          ],
          format: 'auto',
          quality: 'auto:best'
        }
      case 'backdrop':
        return {
          folder: `cinenacional/backdrops${movieId ? `/${movieId}` : ''}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' }
          ],
          format: 'auto',
          quality: 'auto:best'
        }
      default:
        return {
          folder: `cinenacional/gallery${movieId ? `/${movieId}` : ''}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }
          ],
          format: 'auto',
          quality: 'auto:good'
        }
    }
  }

  const handleUploadSuccess = (result: any) => {
    const { secure_url, public_id } = result.info
    setImageUrl(secure_url)
    onChange(secure_url, public_id)
    toast.success('Imagen subida exitosamente')
  }

  const handleRemove = () => {
    setImageUrl('')
    onChange('', '')
  }

  const aspectRatio = type === 'poster' ? '2/3' : type === 'backdrop' ? '16/9' : '1/1'
  const dimensions = type === 'poster' ? '500x750px' : type === 'backdrop' ? '1920x1080px' : '1200x1200px'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {!imageUrl ? (
        <CldUploadWidget
          uploadPreset="cinenacional-unsigned" // Crear este preset en Cloudinary
          options={{
            ...getUploadPreset(),
            sources: ['local', 'url', 'google_drive', 'dropbox'],
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxFileSize: 10000000, // 10MB
            language: 'es',
            text: {
              es: {
                or: 'O',
                menu: {
                  files: 'Mis archivos',
                  web: 'Dirección web',
                },
                selection_counter: {
                  selected: 'Seleccionado'
                },
                actions: {
                  upload: 'Subir',
                  clear_all: 'Limpiar todo',
                  log_out: 'Cerrar sesión'
                },
                messages: {
                  max_files_limit: 'Solo puedes subir 1 archivo',
                  min_files_limit: 'Debes subir al menos 1 archivo',
                  max_file_size: 'El archivo es demasiado grande (máx. 10MB)',
                  allowed_formats: 'Formato no permitido. Usa: JPG, PNG, WEBP',
                  upload_successful: 'Subida exitosa',
                  upload_failed: 'Error al subir'
                },
                local: {
                  browse: 'Buscar',
                  dd_title_single: 'Arrastra y suelta tu imagen aquí',
                  drop_title_single: 'Suelta el archivo para subirlo',
                }
              }
            }
          }}
          onUpload={(result: any) => handleUploadSuccess(result)}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              disabled={disabled}
              className="relative block w-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900">
                Click para subir o arrastra una imagen aquí
              </p>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG o WEBP hasta 10MB
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Tamaño recomendado: {dimensions}
              </p>
            </button>
          )}
        </CldUploadWidget>
      ) : (
        <div className="relative group">
          <div 
            className="relative rounded-lg overflow-hidden bg-gray-100 shadow-lg"
            style={{ aspectRatio }}
          >
            <Image
              src={imageUrl}
              alt={label}
              fill
              className="object-cover"
            />
            
            {/* Overlay con acciones */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center space-x-4">
                <CldUploadWidget
                  uploadPreset="cinenacional-unsigned"
                  options={{
                    ...getUploadPreset(),
                    sources: ['local', 'url'],
                    multiple: false,
                    maxFiles: 1
                  }}
                  onUpload={(result: any) => handleUploadSuccess(result)}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      className="bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>Cambiar</span>
                      </span>
                    </button>
                  )}
                </CldUploadWidget>
                
                <button
                  type="button"
                  onClick={handleRemove}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Subida a Cloudinary ✓ • {dimensions}
          </div>
        </div>
      )}
    </div>
  )
}