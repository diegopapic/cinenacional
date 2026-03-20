// src/hooks/useHomeData.ts
import { useQuery } from '@tanstack/react-query'
import { MovieWithRelease, SimpleMovie, SimplePerson, HomeDataResponse } from '@/types/home.types'

interface UseHomeDataReturn {
  ultimosEstrenos: MovieWithRelease[];
  proximosEstrenos: MovieWithRelease[];
  ultimasPeliculas: SimpleMovie[];
  ultimasPersonas: SimplePerson[];
  loadingEstrenos: boolean;
  loadingProximos: boolean;
  loadingRecientes: boolean;
  error: string | null;
  retry: () => void;
}

async function fetchHomeData(): Promise<HomeDataResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch('/api/movies/home-feed', {
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export function useHomeData(): UseHomeDataReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home-feed'],
    queryFn: fetchHomeData,
    staleTime: 60 * 1000, // 1 min
    retry: 2,
  })

  return {
    ultimosEstrenos: data?.ultimosEstrenos ?? [],
    proximosEstrenos: data?.proximosEstrenos ?? [],
    ultimasPeliculas: data?.ultimasPeliculas ?? [],
    ultimasPersonas: data?.ultimasPersonas ?? [],
    loadingEstrenos: isLoading,
    loadingProximos: isLoading,
    loadingRecientes: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Error desconocido') : null,
    retry: () => { refetch() },
  }
}
