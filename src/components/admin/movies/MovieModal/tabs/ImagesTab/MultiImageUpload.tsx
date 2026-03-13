// src/components/admin/movies/MovieModal/tabs/ImagesTab/MultiImageUpload.tsx
'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('MultiImageUpload')

interface MultiImageUploadProps {
  movieId: number
  onUploadComplete: (publicIds: string[]) => void
  disabled?: boolean
}

export function MultiImageUpload({
  movieId,
  onUploadComplete,
  disabled = false
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const widgetRef = useRef<(() => void) | null>(null)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const widgetDidOpenRef = useRef(false)

  // Usar ref para los IDs (evita problemas de closure)
  const uploadedIdsRef = useRef<string[]>([])

  // Limpiar safety timeout
  const clearSafetyTimeout = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      clearSafetyTimeout()
    }
  }, [clearSafetyTimeout])

  const handleOpen = useCallback(() => {
    log.debug('Widget opened')
    widgetDidOpenRef.current = true
    clearSafetyTimeout()
  }, [clearSafetyTimeout])

  const handleUploadSuccess = useCallback((result: any) => {
    if (result.info) {
      const { public_id } = result.info
      log.debug('Image uploaded', { public_id })
      uploadedIdsRef.current.push(public_id)
      setUploadCount(prev => prev + 1)
    }
  }, [])

  const handleClose = useCallback(() => {
    const uploadedIds = uploadedIdsRef.current
    log.debug('Upload widget closed', { count: uploadedIds.length })

    clearSafetyTimeout()
    setIsUploading(false)

    if (uploadedIds.length > 0) {
      onUploadComplete([...uploadedIds]) // Pasar copia del array
      toast.success(`${uploadedIds.length} imagen(es) subida(s)`)
    }

    // Resetear para próxima subida
    uploadedIdsRef.current = []
    setUploadCount(0)

    // Restaurar scroll
    document.body.style.overflow = ''
  }, [onUploadComplete, clearSafetyTimeout])

  const openWidget = useCallback(() => {
    if (isUploading) return

    if (widgetRef.current) {
      // Resetear antes de abrir
      uploadedIdsRef.current = []
      setUploadCount(0)
      widgetDidOpenRef.current = false
      setIsUploading(true)

      try {
        widgetRef.current()
      } catch (err) {
        log.error('Error opening widget', err)
        toast.error('Error al abrir el selector de imágenes')
        setIsUploading(false)
        return
      }

      // Safety timeout
      safetyTimeoutRef.current = setTimeout(() => {
        if (!widgetDidOpenRef.current) {
          log.warn('Widget open timed out - resetting state')
          toast.error('No se pudo abrir el selector de imágenes. Intentá de nuevo.')
          setIsUploading(false)
        }
      }, 5000)
    }
  }, [isUploading])

  return (
    <CldUploadWidget
      uploadPreset="cinenacional-unsigned"
      options={{
        folder: `cinenacional/gallery/${movieId}`,
        sources: ['local', 'url', 'google_drive', 'dropbox'],
        multiple: true,
        maxFiles: 20,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 10000000,
        resourceType: 'image',
        showCompletedButton: true,
        showUploadMoreButton: true,
        singleUploadAutoClose: false,
        showPoweredBy: false,
        language: 'es',
        text: {
          es: {
            or: 'O',
            menu: {
              files: 'Mis archivos',
              web: 'Dirección web',
            },
            actions: {
              upload: 'Subir',
              done: 'Listo'
            },
            local: {
              browse: 'Buscar',
              dd_title_multi: 'Arrastra y suelta tus imágenes aquí',
              drop_title_multi: 'Suelta los archivos para subirlos',
            }
          }
        }
      }}
      onOpen={handleOpen}
      onSuccess={handleUploadSuccess}
      onClose={handleClose}
    >
      {({ open }) => {
        widgetRef.current = open

        return (
          <button
            type="button"
            onClick={openWidget}
            disabled={disabled || isUploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-sm font-medium text-gray-700">
                  Subiendo imágenes... ({uploadCount} completadas)
                </p>
              </>
            ) : (
              <>
                <ImagePlus className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  Click para subir imágenes
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Puedes seleccionar múltiples archivos (hasta 20)
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  JPG, PNG o WEBP • Máx 10MB cada una
                </p>
              </>
            )}
          </button>
        )
      }}
    </CldUploadWidget>
  )
}
