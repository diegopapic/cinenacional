# Movie Utils

**Ubicación**: `/src/lib/movies/movieUtils.ts`

#### Cálculo de Duración
```typescript
export function calcularTipoDuracion(minutos: number, segundos?: number): string {
  const totalMinutos = minutos + (segundos || 0) / 60
  
  if (totalMinutos >= 60) return 'largometraje'
  if (totalMinutos >= 30) return 'mediometraje'
  return 'cortometraje'
}
```

#### Preparación de Datos
```typescript
export function prepareMovieData(data: MovieFormData): any {
  const prepared: any = {}
  
  // Limpiar strings vacíos
  Object.keys(data).forEach(key => {
    const value = data[key as keyof MovieFormData]
    if (typeof value === 'string') {
      prepared[key] = value.trim() || undefined
    } else {
      prepared[key] = value
    }
  })
  
  // Parsear campos numéricos
  if (prepared.year) {
    prepared.year = parseInt(prepared.year)
  }
  if (prepared.duration) {
    prepared.duration = parseInt(prepared.duration)
  }
  
  // Validar URLs
  if (prepared.posterUrl && !isValidUrl(prepared.posterUrl)) {
    delete prepared.posterUrl
  }
  if (prepared.trailerUrl && !isValidUrl(prepared.trailerUrl)) {
    delete prepared.trailerUrl
  }
  
  return prepared
}
```

#### Utilidades de Display
```typescript
export function getCompletenessLabel(completeness: string): string {
  const labels: Record<string, string> = {
    'BASIC_PRESS_KIT': 'Kit de prensa básico',
    'FULL_PRESS_KIT': 'Kit de prensa completo',
    'MAIN_CAST': 'Elenco principal',
    'MAIN_CREW': 'Equipo principal',
    'FULL_CAST': 'Elenco completo',
    'FULL_CREW': 'Equipo completo'
  }
  return labels[completeness] || completeness
}

export function getCompletenessColor(completeness: string): string {
  const colors: Record<string, string> = {
    'BASIC_PRESS_KIT': 'bg-yellow-100 text-yellow-800',
    'FULL_PRESS_KIT': 'bg-green-100 text-green-800',
    'MAIN_CAST': 'bg-blue-100 text-blue-800',
    'MAIN_CREW': 'bg-purple-100 text-purple-800',
    'FULL_CAST': 'bg-indigo-100 text-indigo-800',
    'FULL_CREW': 'bg-pink-100 text-pink-800'
  }
  return colors[completeness] || 'bg-gray-100 text-gray-800'
}

export function getStageColor(stage?: string): string {
  const colors: Record<string, string> = {
    'COMPLETA': 'bg-green-100 text-green-800',
    'EN_DESARROLLO': 'bg-yellow-100 text-yellow-800',
    'EN_POSTPRODUCCION': 'bg-orange-100 text-orange-800',
    'EN_PREPRODUCCION': 'bg-blue-100 text-blue-800',
    'EN_RODAJE': 'bg-purple-100 text-purple-800',
    'INCONCLUSA': 'bg-red-100 text-red-800',
    'INEDITA': 'bg-gray-100 text-gray-800'
  }
  return colors[stage || ''] || 'bg-gray-100 text-gray-800'
}

export function getStageName(stage?: string): string {
  const names: Record<string, string> = {
    'COMPLETA': 'Completa',
    'EN_DESARROLLO': 'En desarrollo',
    'EN_POSTPRODUCCION': 'En postproducción',
    'EN_PREPRODUCCION': 'En preproducción',
    'EN_RODAJE': 'En rodaje',
    'INCONCLUSA': 'Inconclusa',
    'INEDITA': 'Inédita'
  }
  return names[stage || ''] || stage || 'Desconocido'
}
```

#### Manejo de Fechas
```typescript
export function buildReleaseDateData(
  isPartialDate: boolean,
  releaseDate?: string,
  partialReleaseDate?: PartialDate
): ReleaseDateData {
  if (isPartialDate && partialReleaseDate) {
    return {
      releaseYear: partialReleaseDate.year,
      releaseMonth: partialReleaseDate.month,
      releaseDay: partialReleaseDate.day
    }
  } else if (releaseDate) {
    const [year, month, day] = releaseDate.split('-').map(Number)
    return {
      releaseYear: year,
      releaseMonth: month,
      releaseDay: day
    }
  }
  
  return {
    releaseYear: null,
    releaseMonth: null,
    releaseDay: null
  }
}
```