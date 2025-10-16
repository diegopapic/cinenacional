// src/lib/obituarios/obituariosTypes.ts

export interface PersonWithDeath {
  id: number;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  deathYear: number;
  deathMonth: number | null;
  deathDay: number | null;
}

export interface ObituariosFilters {
  year?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ObituariosPagination {
  page: number;
  totalPages: number;
  total: number;
}