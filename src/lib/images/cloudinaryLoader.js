/**
 * Custom loader para next/image con Cloudinary.
 *
 * Uso: <Image loader={cloudinaryLoader} src={url} ... />
 *
 * Extrae el public ID de la URL de Cloudinary y aplica transforms
 * basados en el width/quality que next/image solicita para cada
 * entrada del srcset.
 */

'use client'

/** @type {import('next/image').ImageLoader} */
function cloudinaryLoader({ src, width, quality }) {
  // No es Cloudinary → devolver tal cual
  if (!src.includes('res.cloudinary.com')) {
    return src
  }

  const q = quality || 'auto'

  const uploadSegment = '/image/upload/'
  const uploadIndex = src.indexOf(uploadSegment)
  if (uploadIndex === -1) return src

  const afterUpload = src.substring(uploadIndex + uploadSegment.length)

  // Separar segments para encontrar dónde empieza el publicId
  const segments = afterUpload.split('/')
  const publicIdParts = []
  let foundPublicId = false

  for (const seg of segments) {
    if (foundPublicId) {
      publicIdParts.push(seg)
      continue
    }
    // Segments de transformación: contienen comas o pattern tipo clave_valor
    if (seg.includes(',') || /^[a-z]{1,2}_/.test(seg)) {
      continue
    }
    // Segments de versión: v seguido de dígitos
    if (/^v\d+$/.test(seg)) {
      continue
    }
    foundPublicId = true
    publicIdParts.push(seg)
  }

  const publicIdWithExt = publicIdParts.join('/')
  // Remover extensión para que Cloudinary aplique f_auto
  const publicId = publicIdWithExt.replace(/\.\w{3,4}$/, '')

  const baseUrl = src.substring(0, uploadIndex + uploadSegment.length)
  const transforms = `w_${width},c_limit,q_${q},f_auto`

  return `${baseUrl}${transforms}/${publicId}`
}

module.exports = cloudinaryLoader
