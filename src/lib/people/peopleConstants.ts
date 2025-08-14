// src/lib/people/peopleConstants.ts

import { Gender, PersonLinkType } from './peopleTypes';

// Opciones de género
export const GENDER_OPTIONS = [
  { value: 'MALE' as Gender, label: 'Masculino' },
  { value: 'FEMALE' as Gender, label: 'Femenino' },
  { value: 'OTHER' as Gender, label: 'Otro' },
] as const;

// Tipos de links con sus etiquetas
export const PERSON_LINK_TYPES: Record<PersonLinkType, string> = {
  IMDB: 'IMDb',
  TMDB: 'TMDb',
  CINENACIONAL: 'CineNacional',
  WIKIPEDIA: 'Wikipedia',
  OFFICIAL_WEBSITE: 'Sitio Web Oficial',
  PORTFOLIO: 'Portfolio',
  BLOG: 'Blog',
  INSTAGRAM: 'Instagram',
  TWITTER: 'Twitter',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  VIMEO: 'Vimeo',
  LETTERBOXD: 'Letterboxd',
  SPOTIFY: 'Spotify',
  PODCAST: 'Podcast',
  INTERVIEW: 'Entrevista',
  ARTICLE: 'Artículo',
  OTHER: 'Otro',
} as const;

// Array de opciones para selects
export const PERSON_LINK_TYPE_OPTIONS = Object.entries(PERSON_LINK_TYPES).map(
  ([value, label]) => ({ value, label })
);

// Categorías de links para organización en UI
export const LINK_CATEGORIES = {
  databases: {
    label: 'Bases de datos',
    types: ['IMDB', 'TMDB', 'CINENACIONAL'] as PersonLinkType[],
  },
  encyclopedias: {
    label: 'Enciclopedias',
    types: ['WIKIPEDIA'] as PersonLinkType[],
  },
  websites: {
    label: 'Sitios web',
    types: ['OFFICIAL_WEBSITE', 'PORTFOLIO', 'BLOG'] as PersonLinkType[],
  },
  social: {
    label: 'Redes sociales',
    types: ['INSTAGRAM', 'TWITTER', 'FACEBOOK', 'YOUTUBE', 'TIKTOK', 'LINKEDIN'] as PersonLinkType[],
  },
  content: {
    label: 'Plataformas de contenido',
    types: ['VIMEO', 'LETTERBOXD', 'SPOTIFY', 'PODCAST'] as PersonLinkType[],
  },
  other: {
    label: 'Otros',
    types: ['INTERVIEW', 'ARTICLE', 'OTHER'] as PersonLinkType[],
  },
} as const;

// Valores por defecto para formularios
export const DEFAULT_PERSON_FORM_VALUES = {
  firstName: '',
  lastName: '',
  realName: '',
  birthDate: '',
  deathDate: '',
  birthLocation: '',
  deathLocation: '',
  biography: '',
  photoUrl: '',
  gender: '',
  hideAge: false,
  isActive: true,
  links: [],
} as const;

// Valores por defecto para un nuevo link
export const DEFAULT_PERSON_LINK = {
  type: 'OTHER' as PersonLinkType,
  url: '',
  title: '',
  displayOrder: 0,
  isVerified: false,
  isActive: true,
} as const;

// Configuración de paginación
export const PEOPLE_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMITS: [10, 20, 50, 100],
} as const;

// Mensajes de error comunes
export const PERSON_ERROR_MESSAGES = {
  FETCH_ERROR: 'Error al cargar las personas',
  CREATE_ERROR: 'Error al crear la persona',
  UPDATE_ERROR: 'Error al actualizar la persona',
  DELETE_ERROR: 'Error al eliminar la persona',
  DELETE_WITH_MOVIES: 'No se puede eliminar esta persona porque está asociada a películas',
  REQUIRED_NAME: 'Debe ingresar al menos el nombre o el apellido',
  INVALID_DATES: 'La fecha de fallecimiento debe ser posterior a la fecha de nacimiento',
  DUPLICATE_SLUG: 'Ya existe una persona con ese nombre',
} as const;

// Mensajes de éxito
export const PERSON_SUCCESS_MESSAGES = {
  CREATED: 'Persona creada exitosamente',
  UPDATED: 'Persona actualizada exitosamente',
  DELETED: 'Persona eliminada exitosamente',
} as const;