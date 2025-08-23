// src/hooks/useHomeData.ts
import { useState, useEffect } from 'react';
import { MovieWithRelease, SimpleMovie, SimplePerson, HomeDataResponse } from '@/types/home.types';

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

export function useHomeData(): UseHomeDataReturn {
  const [ultimosEstrenos, setUltimosEstrenos] = useState<MovieWithRelease[]>([]);
  const [proximosEstrenos, setProximosEstrenos] = useState<MovieWithRelease[]>([]);
  const [ultimasPeliculas, setUltimasPeliculas] = useState<SimpleMovie[]>([]);
  const [ultimasPersonas, setUltimasPersonas] = useState<SimplePerson[]>([]);
  const [loadingEstrenos, setLoadingEstrenos] = useState(true);
  const [loadingProximos, setLoadingProximos] = useState(true);
  const [loadingRecientes, setLoadingRecientes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeData = async (attempt = 1) => {
    try {
      console.log(`🔄 Intento ${attempt} de cargar datos...`);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏱️ Timeout alcanzado, abortando...');
        controller.abort();
      }, 20000);

      const response = await fetch('/api/movies/home-feed', {
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: HomeDataResponse = await response.json();
      console.log('✅ Datos recibidos del home-feed:', {
        ultimosEstrenos: data.ultimosEstrenos?.length || 0,
        proximosEstrenos: data.proximosEstrenos?.length || 0,
        ultimasPeliculas: data.ultimasPeliculas?.length || 0,
        ultimasPersonas: data.ultimasPersonas?.length || 0
      });

      console.log('🎬 Primer último estreno:', data.ultimosEstrenos?.[0]);
      console.log('🖼️ PosterUrl del primer último estreno:', data.ultimosEstrenos?.[0]?.posterUrl);
      console.log('🎬 Primer próximo estreno:', data.proximosEstrenos?.[0]);
      console.log('🖼️ PosterUrl del primer próximo estreno:', data.proximosEstrenos?.[0]?.posterUrl);

      setUltimosEstrenos(data.ultimosEstrenos || []);
      setProximosEstrenos(data.proximosEstrenos || []);
      setUltimasPeliculas(data.ultimasPeliculas || []);
      setUltimasPersonas(data.ultimasPersonas || []);
      setError(null);

    } catch (error: any) {
      console.error(`❌ Error en intento ${attempt}:`, error);

      if (error.name === 'AbortError') {
        setError('La carga tardó demasiado. Intentando de nuevo...');
      } else {
        setError(`Error al cargar datos: ${error.message}`);
      }

      if (attempt < 3) {
        const delay = attempt * 2000;
        console.log(`⏳ Reintentando en ${delay / 1000} segundos...`);
        setTimeout(() => fetchHomeData(attempt + 1), delay);
      } else {
        setError('No se pudieron cargar los datos después de varios intentos.');
        setUltimasPeliculas([]);
        setUltimasPersonas([]);
      }
    } finally {
      setLoadingEstrenos(false);
      setLoadingProximos(false);
      setLoadingRecientes(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const retry = () => {
    setLoadingEstrenos(true);
    setLoadingProximos(true);
    setLoadingRecientes(true);
    fetchHomeData();
  };

  return {
    ultimosEstrenos,
    proximosEstrenos,
    ultimasPeliculas,
    ultimasPersonas,
    loadingEstrenos,
    loadingProximos,
    loadingRecientes,
    error,
    retry
  };
}