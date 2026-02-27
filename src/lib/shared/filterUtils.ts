// src/lib/shared/filterUtils.ts
// Factory para generar funciones de filtros (toSearchParams, fromSearchParams, toApiParams, etc.)
// Elimina la duplicación entre movieListUtils y personListUtils.

type FieldType = 'string' | 'number'

interface FieldDef {
  type: FieldType
  /** Custom parser para leer desde URL params (ej: roleId que puede ser 'ACTOR' o number) */
  parse?: (raw: string) => unknown
  /** Valores válidos — si se especifica, solo se aceptan estos desde URL params */
  validValues?: readonly string[]
}

type FieldConfig = FieldType | FieldDef

interface FilterSchemaConfig<T> {
  /** Definiciones de los campos de filtro (NO incluir sortBy, sortOrder, page, limit) */
  fields: Record<string, FieldConfig>
  /** Valores por defecto del objeto de filtros completo */
  defaults: T
  /** Valores válidos para sortBy (para validación al parsear URL params) */
  sortByValues: readonly string[]
  /** Sort order por defecto para un sortBy dado (cuando sortOrder no viene en la URL) */
  defaultSortOrder: (sortBy: string) => 'asc' | 'desc'
}

interface FilterHelpers<T> {
  filtersToSearchParams(filters: T): URLSearchParams
  searchParamsToFilters(searchParams: URLSearchParams): T
  filtersToApiParams(filters: T): Record<string, string>
  countActiveFilters(filters: T): number
  hasActiveFilters(filters: T): boolean
  clearFilters(filters: T): T
  getDefaultSortOrder(sortBy: string): 'asc' | 'desc'
}

type BaseFilters = {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export function createFilterHelpers<T extends BaseFilters>(
  schema: FilterSchemaConfig<T>
): FilterHelpers<T> {
  const fieldNames = Object.keys(schema.fields)
  const defaults = schema.defaults as Record<string, unknown>

  function getFieldDef(name: string): FieldDef {
    const config = schema.fields[name]
    if (typeof config === 'string') return { type: config }
    return config
  }

  function filtersToSearchParams(filters: T): URLSearchParams {
    const params = new URLSearchParams()
    const f = filters as Record<string, unknown>

    for (const name of fieldNames) {
      if (f[name]) params.set(name, String(f[name]))
    }

    if (f.sortBy && f.sortBy !== defaults.sortBy) {
      params.set('sortBy', String(f.sortBy))
    }
    if (f.sortOrder && f.sortOrder !== defaults.sortOrder) {
      params.set('sortOrder', String(f.sortOrder))
    }
    if (f.page && f.page !== 1) {
      params.set('page', String(f.page))
    }

    return params
  }

  function searchParamsToFilters(searchParams: URLSearchParams): T {
    const filters = { ...schema.defaults } as Record<string, unknown>

    for (const name of fieldNames) {
      const raw = searchParams.get(name)
      if (!raw) continue

      const def = getFieldDef(name)

      if (def.validValues && !def.validValues.includes(raw)) continue

      if (def.parse) {
        filters[name] = def.parse(raw)
      } else if (def.type === 'number') {
        filters[name] = parseInt(raw)
      } else {
        filters[name] = raw
      }
    }

    const sortByRaw = searchParams.get('sortBy')
    if (sortByRaw && (schema.sortByValues as readonly string[]).includes(sortByRaw)) {
      filters.sortBy = sortByRaw
    }

    const sortOrderRaw = searchParams.get('sortOrder')
    if (sortOrderRaw === 'asc' || sortOrderRaw === 'desc') {
      filters.sortOrder = sortOrderRaw
    } else if (filters.sortBy) {
      filters.sortOrder = schema.defaultSortOrder(filters.sortBy as string)
    }

    const pageRaw = searchParams.get('page')
    if (pageRaw) filters.page = parseInt(pageRaw)

    return filters as T
  }

  function filtersToApiParams(filters: T): Record<string, string> {
    const params: Record<string, string> = {}
    const f = filters as Record<string, unknown>

    for (const name of fieldNames) {
      if (f[name]) params[name] = String(f[name])
    }

    if (f.sortBy) params.sortBy = String(f.sortBy)
    if (f.sortOrder) params.sortOrder = String(f.sortOrder)
    if (f.page) params.page = String(f.page)
    if (f.limit) params.limit = String(f.limit)

    return params
  }

  function countActiveFilters(filters: T): number {
    let count = 0
    const f = filters as Record<string, unknown>
    for (const name of fieldNames) {
      if (f[name]) count++
    }
    return count
  }

  function hasActiveFilters(filters: T): boolean {
    return countActiveFilters(filters) > 0
  }

  function clearFilters(filters: T): T {
    return {
      ...schema.defaults,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: filters.limit,
    } as T
  }

  return {
    filtersToSearchParams,
    searchParamsToFilters,
    filtersToApiParams,
    countActiveFilters,
    hasActiveFilters,
    clearFilters,
    getDefaultSortOrder: schema.defaultSortOrder,
  }
}
