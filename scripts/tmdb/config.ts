// TMDB API Configuration
// Documentación: https://developer.themoviedb.org/docs

export const config = {
  // API Read Access Token (Bearer token)
  tmdbAccessToken: process.env.TMDB_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWU4NjYxYmU4NDc4YzQ2ODljOWZmYTVmMTAzOGY4ZiIsIm5iZiI6MTU3NDIxMjg5NC41MzMsInN1YiI6IjVkZDQ5NTFlMzU2YTcxNTg3NWViM2RmNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.nhpEuKh4uyr4Mp0avMqNmGuwPC2cj0byvHJaAsGIdkE',
  
  // API Key (v3 auth) - alternativa
  tmdbApiKey: process.env.TMDB_API_KEY || 'dee8661be8478c4689c9ffa5f1038f8f',
  
  // Base URLs
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  
  // Database connection (para scripts standalone)
  databaseUrl: process.env.DATABASE_URL || 'postgresql://cinenacional:Paganitzu@localhost:5433/cinenacional',
  
  // Rate limiting
  requestsPerSecond: 35, // TMDB permite ~40, dejamos margen
  delayBetweenRequests: 30, // ms entre requests
  
  // Matching thresholds
  matching: {
    // Para personas
    person: {
      autoAcceptScore: 80,    // Score >= 80: aceptar automáticamente
      reviewScore: 50,         // Score 50-79: marcar para revisión
      rejectScore: 49,         // Score < 50: rechazar
    },
    // Para películas
    movie: {
      exactTitleYearBonus: 50,
      directorMatchBonus: 30,
      argentinaCountryBonus: 20,
      durationToleranceMinutes: 5,
      durationMatchBonus: 10,
    }
  },
  
  // IDs conocidos
  roles: {
    director: 2, // role_id para Director
  },
  
  // Países
  countries: {
    argentina: {
      tmdbCode: 'AR',
      iso: 'AR',
    }
  }
};

export default config;
