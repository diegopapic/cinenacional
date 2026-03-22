/**
 * Custom loader para next/image con Cloudinary.
 *
 * next/image llama a este loader para cada tamaño del srcset,
 * pasando width y quality. El loader:
 *
 * 1. URLs de Cloudinary → extrae public ID, aplica w_{width}, f_auto, q_{quality}
 * 2. URLs ya transformadas (contienen w_, h_, etc.) → reemplaza transforms
 * 3. URLs no-Cloudinary → devuelve tal cual
 */

/** @type {import('next/image').ImageLoader} */
module.exports = function cloudinaryLoader({ src, width, quality }) {
  // No es Cloudinary → devolver tal cual
  if (!src.includes('res.cloudinary.com') && !src.includes('cloudinary')) {
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
