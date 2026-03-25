// src/lib/people/roleSlugMap.ts
// Maps SEO-friendly slugs to roleId values for /listados/personas/[roleSlug] routes.

export interface RoleSlugConfig {
  roleId: string          // 'ACTOR', 'SELF', or numeric string
  /** Used in <title> and <h1> */
  title: string
  /** Meta description */
  description: string
}

/**
 * Slug → role config map.
 * Only roles with significant SEO value get their own route.
 */
export const ROLE_SLUG_MAP: Record<string, RoleSlugConfig> = {
  'actores': {
    roleId: 'ACTOR',
    title: 'Actores y actrices',
    description: 'Explorá el listado completo de actores y actrices del cine argentino.',
  },
  'como-si-mismos': {
    roleId: 'SELF',
    title: 'Apariciones como sí mismos',
    description: 'Personas que aparecen como sí mismas en películas argentinas.',
  },
  'directores': {
    roleId: '2',
    title: 'Directores',
    description: 'Explorá el listado completo de directores del cine argentino.',
  },
  'guionistas': {
    roleId: '3',
    title: 'Guionistas',
    description: 'Explorá el listado completo de guionistas del cine argentino.',
  },
  'autores': {
    roleId: '236',
    title: 'Autores',
    description: 'Explorá el listado completo de autores del cine argentino.',
  },
  'fotografia': {
    roleId: '526',
    title: 'Directores de fotografía',
    description: 'Explorá el listado completo de directores de fotografía del cine argentino.',
  },
  'camara': {
    roleId: '272',
    title: 'Camarógrafos',
    description: 'Explorá el listado completo de camarógrafos del cine argentino.',
  },
  'montaje': {
    roleId: '636',
    title: 'Montajistas',
    description: 'Explorá el listado completo de montajistas del cine argentino.',
  },
  'musica': {
    roleId: '641',
    title: 'Compositores y músicos',
    description: 'Explorá el listado completo de compositores y músicos del cine argentino.',
  },
  'produccion': {
    roleId: '689',
    title: 'Productores',
    description: 'Explorá el listado completo de productores del cine argentino.',
  },
  'produccion-ejecutiva': {
    roleId: '703',
    title: 'Productores ejecutivos',
    description: 'Explorá el listado completo de productores ejecutivos del cine argentino.',
  },
  'direccion-de-arte': {
    roleId: '836',
    title: 'Directores de arte',
    description: 'Explorá el listado completo de directores de arte del cine argentino.',
  },
  'escenografia': {
    roleId: '834',
    title: 'Escenógrafos',
    description: 'Explorá el listado completo de escenógrafos del cine argentino.',
  },
  'sonido': {
    roleId: '767',
    title: 'Sonidistas',
    description: 'Explorá el listado completo de sonidistas del cine argentino.',
  },
  'direccion-de-sonido': {
    roleId: '402',
    title: 'Directores de sonido',
    description: 'Explorá el listado completo de directores de sonido del cine argentino.',
  },
  'diseno-de-sonido': {
    roleId: '444',
    title: 'Diseñadores de sonido',
    description: 'Explorá el listado completo de diseñadores de sonido del cine argentino.',
  },
  'vestuario': {
    roleId: '835',
    title: 'Vestuaristas',
    description: 'Explorá el listado completo de vestuaristas del cine argentino.',
  },
  'maquillaje': {
    roleId: '838',
    title: 'Maquilladores',
    description: 'Explorá el listado completo de maquilladores del cine argentino.',
  },
  'animacion': {
    roleId: '111',
    title: 'Animadores',
    description: 'Explorá el listado completo de animadores del cine argentino.',
  },
}

/** All valid role slugs — used for generateStaticParams */
export const ROLE_SLUGS = Object.keys(ROLE_SLUG_MAP)

/** Reverse lookup: roleId → slug (for FilterBar navigation) */
export const ROLE_ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_SLUG_MAP).map(([slug, config]) => [config.roleId, slug])
)
