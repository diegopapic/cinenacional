/**
 * Módulo compartido para importación de películas desde TMDB
 *
 * Este módulo contiene toda la lógica común utilizada por:
 * - import-tmdb-movies.ts (CLI manual)
 * - telegram-bot-handler.ts (bot automático)
 */

// Configuración y tipos
export * from './config';

// API de TMDB
export * from './api';

// Base de datos
export * from './database';

// Procesamiento de nombres
export * from './names';

// Integración con Claude
export * from './claude';

// Lógica de importación
export * from './importer';
