// src/components/admin/CloudinaryUploadWidget.tsx
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useMountEffect } from '@/hooks/useMountEffect'
import { Upload, X, ImageIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('CloudinaryUploadWidget')

interface CloudinaryUploadWidgetProps {
  value?: string
  onChange: (url: string, publicId?: string) => void
  label: string
  type?: 'poster' | 'backdrop' | 'gallery' | 'person_photo'
  movieId?: string | number
  personId?: string | number
  disabled?: boolean
  aspectRatio?: string
  maxWidth?: number
  maxDisplayHeight?: number
}

export function CloudinaryUploadWidget({
  value,
  onChange,
  label,
  type = 'poster',
  movieId,
  personId,
  disabled = false,
  aspectRatio: customAspectRatio,
  maxWidth = 1200,
  maxDisplayHeight
}: CloudinaryUploadWidgetProps) {
  const [imageUrl, setImageUrl] = useState(value || '')
  const [prevValue, setPrevValue] = useState(value)
  const [isUploading, setIsUploading] = useState(false)

  // Ref para controlar el widget y evitar múltiples instancias
  const widgetOpenRef = useRef<(() => void) | null>(null)
  const isOpeningRef = useRef(false)
  // Ref para el timeout de seguridad
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref para saber si el widget efectivamente abrió
  const widgetDidOpenRef = useRef(false)

  // Sincronizar con el valor externo (patrón "ajustar estado durante render")
  if (value !== prevValue) {
    setPrevValue(value)
    setImageUrl(value || '')
  }

  // Limpiar al desmontar el componente
  useMountEffect(() => {
    return () => {
      // Restaurar el scroll al desmontar
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.position = ''
      // Reset de refs
      widgetOpenRef.current = null
      isOpeningRef.current = false
      // Limpiar safety timeout
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
    }
  })

  // Configuración según el tipo de imagen
  const getUploadPreset = () => {
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
      case 'person_photo':
        return {
          folder: `cinenacional/people${personId ? `/${personId}` : ''}`,
          transformation: [
            { width: maxWidth || 800, height: Math.round((maxWidth || 800) * 4/3), crop: 'fill', gravity: 'face' }
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

  // Función para restaurar el scroll
  const restoreScroll = useCallback(() => {
    log.debug('Restoring scroll')
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
    document.body.style.position = ''
    document.body.classList.remove('overflow-hidden')
    document.documentElement.classList.remove('overflow-hidden')
  }, [])

  // Limpiar safety timeout (llamado cuando el widget confirma que abrió/cerró/falló)
  const clearSafetyTimeout = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
  }, [])

  // Handler de apertura - confirma que el widget se abrió correctamente
  const handleOpen = useCallback(() => {
    log.debug('Widget opened')
    widgetDidOpenRef.current = true
    clearSafetyTimeout()
  }, [clearSafetyTimeout])

  // Handler de éxito - mejorado con cleanup
  const handleUploadSuccess = useCallback((result: any) => {
    log.debug('Upload success')
    clearSafetyTimeout()
    if (result.info) {
      const { secure_url, public_id } = result.info
      setImageUrl(secure_url)
      onChange(secure_url, public_id)
      toast.success('Imagen subida exitosamente')
    }

    // Resetear estado
    setIsUploading(false)
    isOpeningRef.current = false

    // Restaurar el scroll después de un delay
    setTimeout(() => {
      restoreScroll()
    }, 500)
  }, [onChange, restoreScroll, clearSafetyTimeout])

  // Handler de cierre - mejorado
  const handleClose = useCallback(() => {
    log.debug('Widget closed')
    clearSafetyTimeout()
    setIsUploading(false)
    isOpeningRef.current = false
    restoreScroll()
  }, [restoreScroll, clearSafetyTimeout])

  // Handler de error - mejorado
  const handleError = useCallback((error: any) => {
    log.error('Upload error', error)
    clearSafetyTimeout()
    toast.error('Error al subir la imagen')
    setIsUploading(false)
    isOpeningRef.current = false
    restoreScroll()
  }, [restoreScroll, clearSafetyTimeout])

  // Función para abrir el widget - previene múltiples aperturas
  const openWidget = useCallback(() => {
    // Prevenir múltiples aperturas simultáneas
    if (isOpeningRef.current) {
      log.debug('Widget already opening, skipping')
      return
    }

    if (widgetOpenRef.current) {
      log.debug('Opening widget')
      isOpeningRef.current = true
      widgetDidOpenRef.current = false
      setIsUploading(true)

      try {
        widgetOpenRef.current()
      } catch (err) {
        log.error('Error opening widget', err)
        toast.error('Error al abrir el selector de imágenes')
        setIsUploading(false)
        isOpeningRef.current = false
        return
      }

      // Safety timeout: si en 5 segundos no se disparó onOpen ni onClose, resetear
      safetyTimeoutRef.current = setTimeout(() => {
        if (isOpeningRef.current && !widgetDidOpenRef.current) {
          log.warn('Widget open timed out - resetting state')
          toast.error('No se pudo abrir el selector de imágenes. Intentá de nuevo.')
          setIsUploading(false)
          isOpeningRef.current = false
        }
      }, 5000)
    }
  }, [])

  const handleRemove = useCallback(() => {
    setImageUrl('')
    onChange('', '')
    setIsUploading(false)
    isOpeningRef.current = false
    restoreScroll()
  }, [onChange, restoreScroll])

  // Determinar aspect ratio y dimensiones
  const aspectRatio = customAspectRatio || (
    type === 'poster' ? '2/3' :
    type === 'backdrop' ? '16/9' :
    type === 'person_photo' ? '3/4' :
    '1/1'
  )

  const [aspectWidth, aspectHeight] = aspectRatio.split('/').map(Number)

  const dimensions =
    type === 'poster' ? '500x750px' :
    type === 'backdrop' ? '1920x1080px' :
    type === 'person_photo' ? '600x800px' :
    '1200x1200px'

  // Calcular dimensiones de display
  let displayWidth = '100%'
  let displayHeight = 'auto'

  if (maxDisplayHeight) {
    displayHeight = `${maxDisplayHeight}px`
    displayWidth = `${Math.round(maxDisplayHeight * aspectWidth / aspectHeight)}px`
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* UNA SOLA INSTANCIA DEL WIDGET */}
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
        onOpen={handleOpen}
        onSuccess={handleUploadSuccess}
        onClose={handleClose}
        onError={handleError}
      >
        {({ open }) => {
          // Guardar la función open en el ref
          widgetOpenRef.current = open

          return (
            <>
              {!imageUrl ? (
                // Vista sin imagen
                <button
                  type="button"
                  onClick={openWidget}
                  disabled={disabled || isUploading}
                  className="relative block w-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {isUploading ? 'Subiendo imagen...' : 'Click para subir o arrastra una imagen aquí'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG o WEBP hasta 10MB
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Tamaño recomendado: {dimensions}
                  </p>
                </button>
              ) : (
                // Vista con imagen
                <div className="space-y-2">
                  {/* Preview de la imagen */}
                  <div className="flex justify-center">
                    <div
                      onClick={openWidget}
                      className="relative rounded-lg overflow-hidden bg-gray-100 shadow-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all group"
                      style={{
                        width: displayWidth,
                        height: displayHeight,
                        maxWidth: '100%'
                      }}
                    >
                      <Image
                        src={imageUrl}
                        alt={label || 'Imagen'}
                        fill
                        className="object-cover"
                        style={{
                          objectFit: maxDisplayHeight ? 'contain' : 'cover'
                        }}
                      />

                      {/* Overlay al hacer hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <p className="text-white font-medium text-lg drop-shadow-lg">
                          {isUploading ? 'Subiendo...' : 'Click para cambiar'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openWidget}
                      disabled={isUploading || disabled}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>{isUploading ? 'Subiendo...' : 'Cambiar imagen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={isUploading || disabled}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          )
        }}
      </CldUploadWidget>
    </div>
  )
}
