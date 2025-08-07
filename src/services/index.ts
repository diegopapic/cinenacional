// src/services/index.ts

export { apiClient } from './api-client'
export { moviesService } from './movies.service'
export { metadataService } from './metadata.service'
export { peopleService } from './people.service'

// Re-exportar tipos útiles
export type { default as ApiClient } from './api-client'