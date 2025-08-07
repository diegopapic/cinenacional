// src/services/people.service.ts

interface Person {
  id: number
  name: string
  slug?: string
  birthDate?: string
  deathDate?: string
  biography?: string
  photoUrl?: string
}

interface PersonSearchResult {
  id: number
  name: string
}

export const peopleService = {
  /**
   * Busca personas por nombre
   */
  async search(query: string, limit: number = 10): Promise<PersonSearchResult[]> {
    if (query.length < 2) return []

    try {
      const response = await fetch(`/api/people?search=${encodeURIComponent(query)}&limit=${limit}`)
      if (!response.ok) throw new Error('Error searching people')
      return response.json()
    } catch (error) {
      console.error('Error searching people:', error)
      return []
    }
  },

  /**
   * Crea una nueva persona
   */
  async create(name: string): Promise<Person> {
    const response = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })

    if (!response.ok) {
      throw new Error('Error creating person')
    }

    return response.json()
  },

  /**
   * Obtiene una persona por ID
   */
  async getById(id: number): Promise<Person> {
    const response = await fetch(`/api/people/${id}`)
    
    if (!response.ok) {
      throw new Error('Error loading person')
    }

    return response.json()
  },

  /**
   * Actualiza una persona
   */
  async update(id: number, data: Partial<Person>): Promise<Person> {
    const response = await fetch(`/api/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Error updating person')
    }

    return response.json()
  },

  /**
   * Elimina una persona
   */
  async delete(id: number): Promise<void> {
    const response = await fetch(`/api/people/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Error deleting person')
    }
  }
}