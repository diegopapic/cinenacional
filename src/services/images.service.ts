// src/services/images.service.ts
import { apiClient } from './api-client'
import { 
  ImageWithRelations, 
  ImageFormData, 
  PaginatedImagesResponse,
  ImageType
} from '@/lib/images/imageTypes'

export const imagesService = {
  // Obtener imágenes de una película
  async getByMovieId(movieId: number): Promise<ImageWithRelations[]> {
    const response = await apiClient.get<PaginatedImagesResponse>(
      `/images?movieId=${movieId}&limit=100`
    )
    return response.data
  },

  // Obtener imagen por ID
  async getById(id: number): Promise<ImageWithRelations> {
    return apiClient.get<ImageWithRelations>(`/images/${id}`)
  },

  // Crear una imagen
  async create(data: ImageFormData): Promise<ImageWithRelations> {
    return apiClient.post<ImageWithRelations>('/images', data)
  },

  // Crear múltiples imágenes (para subida masiva)
  async createBulk(
    movieId: number, 
    cloudinaryPublicIds: string[],
    type: ImageType = 'STILL'
  ): Promise<ImageWithRelations[]> {
    const promises = cloudinaryPublicIds.map(publicId => 
      this.create({
        cloudinaryPublicId: publicId,
        movieId,
        type
      })
    )
    return Promise.all(promises)
  },

  // Actualizar imagen
  async update(id: number, data: ImageFormData): Promise<ImageWithRelations> {
    return apiClient.put<ImageWithRelations>(`/images/${id}`, data)
  },

  // Eliminar imagen
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/images/${id}`)
  },

  // Eliminar múltiples imágenes
  async deleteBulk(ids: number[]): Promise<void> {
    await Promise.all(ids.map(id => this.delete(id)))
  }
}