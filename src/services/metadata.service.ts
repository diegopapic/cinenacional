// src/services/metadata.service.ts

interface Rating {
  id: number
  name: string
  abbreviation?: string
  description?: string
}

interface ColorType {
  id: number
  name: string
}

interface Genre {
  id: number
  name: string
  slug: string
}

interface Country {
  id: number
  name: string
  code: string
}

interface Language {
  id: number
  name: string
  code: string
}

interface Company {
  id: number
  name: string
  type: 'PRODUCTION' | 'DISTRIBUTION'
}

interface Theme {
  id: number
  name: string
  slug: string
}

export const metadataService = {
  /**
   * Obtiene las calificaciones disponibles
   */
  async getRatings(): Promise<Rating[]> {
    try {
      const response = await fetch('/api/calificaciones')
      if (!response.ok) throw new Error('Error loading ratings')
      return response.json()
    } catch (error) {
      console.error('Error loading ratings:', error)
      return []
    }
  },

  /**
   * Obtiene los tipos de color disponibles
   */
  async getColorTypes(): Promise<ColorType[]> {
    try {
      const response = await fetch('/api/color-types')
      if (!response.ok) throw new Error('Error loading color types')
      return response.json()
    } catch (error) {
      console.error('Error loading color types:', error)
      return []
    }
  },

  /**
   * Obtiene todos los géneros
   */
  async getGenres(): Promise<Genre[]> {
    try {
      const response = await fetch('/api/genres')
      if (!response.ok) throw new Error('Error loading genres')
      return response.json()
    } catch (error) {
      console.error('Error loading genres:', error)
      return []
    }
  },

  /**
   * Obtiene todos los países
   */
  async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch('/api/countries')
      if (!response.ok) throw new Error('Error loading countries')
      return response.json()
    } catch (error) {
      console.error('Error loading countries:', error)
      return []
    }
  },

  /**
   * Obtiene todos los idiomas
   */
  async getLanguages(): Promise<Language[]> {
    try {
      const response = await fetch('/api/languages')
      if (!response.ok) throw new Error('Error loading languages')
      return response.json()
    } catch (error) {
      console.error('Error loading languages:', error)
      return []
    }
  },

  /**
   * Obtiene las productoras
   */
  async getProductionCompanies(): Promise<Company[]> {
    try {
      const response = await fetch('/api/companies/production')
      if (!response.ok) throw new Error('Error loading production companies')
      return response.json()
    } catch (error) {
      console.error('Error loading production companies:', error)
      return []
    }
  },

  /**
   * Obtiene las distribuidoras
   */
  async getDistributionCompanies(): Promise<Company[]> {
    try {
      const response = await fetch('/api/companies/distribution')
      if (!response.ok) throw new Error('Error loading distribution companies')
      return response.json()
    } catch (error) {
      console.error('Error loading distribution companies:', error)
      return []
    }
  },

  /**
   * Obtiene los temas/keywords
   */
  async getThemes(): Promise<Theme[]> {
    try {
      const response = await fetch('/api/themes')
      if (!response.ok) throw new Error('Error loading themes')
      return response.json()
    } catch (error) {
      console.error('Error loading themes:', error)
      return []
    }
  },

  /**
   * Carga todos los metadatos necesarios para el formulario
   */
  async loadAllFormMetadata() {
    try {
      const [
        genres,
        countries,
        languages,
        prodCompanies,
        distCompanies,
        themes,
        ratings,
        colorTypes
      ] = await Promise.all([
        this.getGenres(),
        this.getCountries(),
        this.getLanguages(),
        this.getProductionCompanies(),
        this.getDistributionCompanies(),
        this.getThemes(),
        this.getRatings(),
        this.getColorTypes()
      ])

      return {
        genres: Array.isArray(genres) ? genres : [],
        countries: Array.isArray(countries) ? countries : [],
        languages: Array.isArray(languages) ? languages : [],
        productionCompanies: Array.isArray(prodCompanies) ? prodCompanies : [],
        distributionCompanies: Array.isArray(distCompanies) ? distCompanies : [],
        themes: Array.isArray(themes) ? themes : [],
        ratings: Array.isArray(ratings) ? ratings : [],
        colorTypes: Array.isArray(colorTypes) ? colorTypes : []
      }
    } catch (error) {
      console.error('Error loading form metadata:', error)
      // Retornar objetos vacíos en caso de error
      return {
        genres: [],
        countries: [],
        languages: [],
        productionCompanies: [],
        distributionCompanies: [],
        themes: [],
        ratings: [],
        colorTypes: []
      }
    }
  }
}