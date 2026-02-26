// src/services/api-client.ts

export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Error: ${response.status} ${response.statusText}`
      let errorData: any

      try {
        errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Si no se puede parsear el error, usar el mensaje por defecto
      }

      throw new ApiError(errorMessage, response.status, errorData)
    }

    // Si la respuesta es 204 No Content, retornar null
    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          url.searchParams.append(key, value)
        }
      })
    }
    
    return url.toString()
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)
    
    const response = await fetch(url, {
      ...fetchOptions,
      method: 'GET'
    })
    
    return this.handleResponse<T>(response)
  }

  async getBlob(endpoint: string, options?: RequestOptions): Promise<Blob> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'GET'
    })

    if (!response.ok) {
      throw new ApiError(
        `Error: ${response.status} ${response.statusText}`,
        response.status
      )
    }

    return response.blob()
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)
    
    const response = await fetch(url, {
      ...fetchOptions,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
    
    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)
    
    const response = await fetch(url, {
      ...fetchOptions,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
    
    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)
    
    const response = await fetch(url, {
      ...fetchOptions,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
    
    return this.handleResponse<T>(response)
  }

  async delete<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    const { params, ...fetchOptions } = options || {}
    const url = this.buildUrl(endpoint, params)
    
    const response = await fetch(url, {
      ...fetchOptions,
      method: 'DELETE'
    })
    
    return this.handleResponse<T>(response)
  }
}

// Instancia por defecto para usar en toda la aplicación
export const apiClient = new ApiClient('/api')

// Exportar la clase por si se necesita crear instancias personalizadas
export default ApiClient