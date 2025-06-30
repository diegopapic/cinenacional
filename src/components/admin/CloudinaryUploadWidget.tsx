// src/components/admin/CloudinaryUploadWidget.tsx
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { useState, useEffect } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

declare global {
  interface Window {
    cloudinaryWidget: any;
  }
}

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
  
  // Sincronizar con el valor externo
  useEffect(() => {
    setImageUrl(value || '')
  }, [value])
  
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
    console.log('Upload result:', result)
    const { secure_url, public_id } = result.info
    console.log('Setting imageUrl to:', secure_url)
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
          uploadPreset="cinenacional-unsigned"
          options={{
            ...getUploadPreset(),
            sources: ['local', 'url', 'google_drive', 'dropbox'],
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxFileSize: 10000000, // 10MB
            showCompletedButton: true,  
            showUploadMoreButton: false, 
            singleUploadAutoClose: false,
            showSkipCropButton: false,
            showPoweredBy: false,
            autoMinimize: false,
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
                  log_out: 'Cerrar sesión',
                  done: 'Listo'
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
          onOpen={(widget: any) => {
            console.log('Widget opened')
            // Guardar referencia al widget
            window.cloudinaryWidget = widget
          }}
          onUpload={(result: any, widget: any) => {
            handleUploadSuccess(result)
            // Prevenir el cierre automático
            if (widget && widget.isShowing()) {
              console.log('Preventing auto-close')
              setTimeout(() => {
                if (!widget.isShowing() && window.cloudinaryWidget) {
                  console.log('Reopening widget')
                  window.cloudinaryWidget.open()
                }
              }, 100)
            }
          }}
          onSuccess={(result: any) => {
            console.log('Success event:', result)
            handleUploadSuccess(result)
          }}
          onClose={(result: any) => {
            console.log('Widget closed', result)
          }}
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
        <div className="space-y-2">
          {/* Preview de la imagen con borde interactivo - envuelto en CldUploadWidget */}
          <CldUploadWidget
            uploadPreset="cinenacional-unsigned"
            options={{
              ...getUploadPreset(),
              sources: ['local', 'url'],
              multiple: false,
              maxFiles: 1,
              singleUploadAutoClose: false,
              showCompletedButton: true,
            }}
            onUpload={(result: any) => handleUploadSuccess(result)}
            onSuccess={(result: any) => handleUploadSuccess(result)}
          >
            {({ open }) => (
              <div 
                onClick={() => open()}
                className="relative rounded-lg overflow-hidden bg-gray-100 shadow-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all group"
                style={{ aspectRatio }}
              >
                <Image
                  src={imageUrl}
                  alt={label}
                  fill
                  className="object-cover"
                />
                
                {/* Overlay al hacer hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <p className="text-white font-medium text-lg drop-shadow-lg">Click para cambiar</p>
                </div>
              </div>
            )}
          </CldUploadWidget>
          
          {/* Botones siempre visibles */}
          <div className="flex gap-2">
            <CldUploadWidget
              uploadPreset="cinenacional-unsigned"
              options={{
                ...getUploadPreset(),
                sources: ['local', 'url'],
                multiple: false,
                maxFiles: 1,
                singleUploadAutoClose: false,
                showCompletedButton: true,
              }}
              onUpload={(result: any) => handleUploadSuccess(result)}
              onSuccess={(result: any) => handleUploadSuccess(result)}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Cambiar imagen</span>
                </button>
              )}
            </CldUploadWidget>
            
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
          
          {/* Info de la imagen */}
          <div className="text-xs text-gray-500 text-center">
            Imagen subida correctamente • {dimensions}
          </div>
          <div className="text-xs text-gray-400 text-center">
            Puedes hacer click en la imagen o usar los botones para cambiarla
          </div>
        </div>
      )}
    </div>
  )
}