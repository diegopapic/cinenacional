// src/services/festivals.service.ts

import { apiClient } from './api-client'
import {
  Festival,
  FestivalFormData,
  FestivalEdition,
  FestivalEditionFormData,
  FestivalSection,
  FestivalSectionFormData,
  FestivalSectionTemplate,
  FestivalSectionTemplateFormData,
  FestivalScreening,
  FestivalScreeningFormData,
  FestivalListItem,
  FestivalEditionListItem,
  FestivalScreeningListItem,
  FestivalWithRelations,
  FestivalEditionWithRelations,
} from '@/lib/festivals/festivalTypes'

// ============================================================================
// INTERFACES PARA RESPUESTAS
// ============================================================================

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface FestivalFilters {
  search?: string
  isActive?: boolean
  locationId?: number
  page?: number
  limit?: number
}

interface FestivalEditionFilters {
  festivalId?: number
  year?: number
  isPublished?: boolean
  page?: number
  limit?: number
}

interface FestivalScreeningFilters {
  editionId?: number
  sectionId?: number
  movieId?: number
  premiereType?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ============================================================================
// SERVICIO DE FESTIVALES
// ============================================================================

export const festivalsService = {
  // --------------------------------------------------------------------------
  // FESTIVALES
  // --------------------------------------------------------------------------

  async getAll(filters?: FestivalFilters): Promise<PaginatedResponse<FestivalListItem>> {
    const params: Record<string, string> = {}

    if (filters?.search) params.search = filters.search
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive)
    if (filters?.locationId) params.locationId = String(filters.locationId)
    if (filters?.page) params.page = String(filters.page)
    if (filters?.limit) params.limit = String(filters.limit)

    return apiClient.get<PaginatedResponse<FestivalListItem>>('/festivals', { params })
  },

  async getById(id: number): Promise<FestivalWithRelations> {
    return apiClient.get<FestivalWithRelations>(`/festivals/${id}`)
  },

  async create(data: FestivalFormData): Promise<Festival> {
    return apiClient.post<Festival>('/festivals', data)
  },

  async update(id: number, data: Partial<FestivalFormData>): Promise<Festival> {
    return apiClient.put<Festival>(`/festivals/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/festivals/${id}`)
  },

  async search(query: string, limit: number = 10): Promise<Festival[]> {
    if (query.length < 2) return []
    return apiClient.get<Festival[]>('/festivals/search', {
      params: { q: query, limit: String(limit) }
    })
  },

  // --------------------------------------------------------------------------
  // EDICIONES
  // --------------------------------------------------------------------------

  async getEditions(festivalId: number, filters?: FestivalEditionFilters): Promise<PaginatedResponse<FestivalEditionListItem>> {
    const params: Record<string, string> = {}

    if (filters?.year) params.year = String(filters.year)
    if (filters?.isPublished !== undefined) params.isPublished = String(filters.isPublished)
    if (filters?.page) params.page = String(filters.page)
    if (filters?.limit) params.limit = String(filters.limit)

    return apiClient.get<PaginatedResponse<FestivalEditionListItem>>(`/festivals/${festivalId}/editions`, { params })
  },

  async getEditionById(editionId: number): Promise<FestivalEditionWithRelations> {
    return apiClient.get<FestivalEditionWithRelations>(`/festival-editions/${editionId}`)
  },

  async createEdition(data: FestivalEditionFormData): Promise<FestivalEdition> {
    return apiClient.post<FestivalEdition>(`/festivals/${data.festivalId}/editions`, data)
  },

  async updateEdition(editionId: number, data: Partial<FestivalEditionFormData>): Promise<FestivalEdition> {
    return apiClient.put<FestivalEdition>(`/festival-editions/${editionId}`, data)
  },

  async deleteEdition(editionId: number): Promise<void> {
    await apiClient.delete(`/festival-editions/${editionId}`)
  },

  // --------------------------------------------------------------------------
  // TEMPLATES DE SECCIONES
  // --------------------------------------------------------------------------

  async getSectionTemplates(festivalId: number): Promise<FestivalSectionTemplate[]> {
    return apiClient.get<FestivalSectionTemplate[]>(`/festivals/${festivalId}/section-templates`)
  },

  async createSectionTemplate(data: FestivalSectionTemplateFormData): Promise<FestivalSectionTemplate> {
    return apiClient.post<FestivalSectionTemplate>(`/festivals/${data.festivalId}/section-templates`, data)
  },

  async updateSectionTemplate(templateId: number, data: Partial<FestivalSectionTemplateFormData>): Promise<FestivalSectionTemplate> {
    return apiClient.put<FestivalSectionTemplate>(`/festival-section-templates/${templateId}`, data)
  },

  async deleteSectionTemplate(templateId: number): Promise<void> {
    await apiClient.delete(`/festival-section-templates/${templateId}`)
  },

  // --------------------------------------------------------------------------
  // SECCIONES
  // --------------------------------------------------------------------------

  async getSections(editionId: number): Promise<FestivalSection[]> {
    return apiClient.get<FestivalSection[]>(`/festival-editions/${editionId}/sections`)
  },

  async createSection(data: FestivalSectionFormData): Promise<FestivalSection> {
    return apiClient.post<FestivalSection>(`/festival-editions/${data.editionId}/sections`, data)
  },

  async updateSection(sectionId: number, data: Partial<FestivalSectionFormData>): Promise<FestivalSection> {
    return apiClient.put<FestivalSection>(`/festival-sections/${sectionId}`, data)
  },

  async deleteSection(sectionId: number): Promise<void> {
    await apiClient.delete(`/festival-sections/${sectionId}`)
  },

  async createSectionsFromTemplates(editionId: number, templateIds: number[]): Promise<FestivalSection[]> {
    return apiClient.post<FestivalSection[]>(`/festival-editions/${editionId}/sections/from-templates`, {
      templateIds
    })
  },

  // --------------------------------------------------------------------------
  // PROYECCIONES
  // --------------------------------------------------------------------------

  async getScreenings(editionId: number, filters?: FestivalScreeningFilters): Promise<PaginatedResponse<FestivalScreeningListItem>> {
    const params: Record<string, string> = {}

    if (filters?.sectionId) params.sectionId = String(filters.sectionId)
    if (filters?.movieId) params.movieId = String(filters.movieId)
    if (filters?.premiereType) params.premiereType = filters.premiereType
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom
    if (filters?.dateTo) params.dateTo = filters.dateTo
    if (filters?.page) params.page = String(filters.page)
    if (filters?.limit) params.limit = String(filters.limit)

    return apiClient.get<PaginatedResponse<FestivalScreeningListItem>>(`/festival-editions/${editionId}/screenings`, { params })
  },

  async getScreeningById(screeningId: number): Promise<FestivalScreening> {
    return apiClient.get<FestivalScreening>(`/festival-screenings/${screeningId}`)
  },

  async createScreening(data: FestivalScreeningFormData): Promise<FestivalScreening> {
    return apiClient.post<FestivalScreening>(`/festival-editions/${data.editionId}/screenings`, data)
  },

  async updateScreening(screeningId: number, data: Partial<FestivalScreeningFormData>): Promise<FestivalScreening> {
    return apiClient.put<FestivalScreening>(`/festival-screenings/${screeningId}`, data)
  },

  async deleteScreening(screeningId: number): Promise<void> {
    await apiClient.delete(`/festival-screenings/${screeningId}`)
  },

  async bulkCreateScreenings(editionId: number, screenings: FestivalScreeningFormData[]): Promise<FestivalScreening[]> {
    return apiClient.post<FestivalScreening[]>(`/festival-editions/${editionId}/screenings/bulk`, {
      screenings
    })
  },
}
