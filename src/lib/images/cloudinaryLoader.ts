/**
 * Custom loader para next/image con Cloudinary.
 *
 * Las URLs del codebase ya incluyen transformaciones de Cloudinary
 * (f_auto, q_auto, w_XXX, etc.) construidas por getCloudinaryUrl()
 * y getPersonPhotoUrl(). Este loader simplemente pasa la URL tal cual
 * sin re-procesarla — así next/image aporta lazy loading, srcset
 * responsive, priority, y blur placeholder sin duplicar trabajo.
 *
 * Para URLs que NO son de Cloudinary, también las devuelve tal cual.
 */
export default function cloudinaryLoader({
  src,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // Las URLs ya vienen completas con transforms de Cloudinary
  return src
}
