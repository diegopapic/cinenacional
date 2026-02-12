/**
 * Configuración y mapeos compartidos para importación de TMDB
 */

// ============================================================================
// MAPEO DE GÉNEROS TMDB -> CINENACIONAL
// ============================================================================

export const GENRE_MAP: Record<number, number> = {
    28: 32,    // Action -> Acción
    12: 30,    // Adventure -> Aventuras
    16: 18,    // Animation -> Animación
    35: 17,    // Comedy -> Comedia
    80: 21,    // Crime -> Policial
    99: 15,    // Documentary -> Documental
    18: 16,    // Drama -> Drama
    10751: 29, // Family -> Infantil
    14: 26,    // Fantasy -> Fantástico
    36: 28,    // History -> Histórica
    27: 19,    // Horror -> Terror
    10402: 25, // Music -> Musical
    9648: 22,  // Mystery -> Suspenso
    10749: 23, // Romance -> Romántica
    878: 27,   // Science Fiction -> Ciencia ficción
    53: 24,    // Thriller -> Thriller
    10752: 36, // War -> Bélica
    37: 33,    // Western -> Western
};

// ============================================================================
// MAPEO DE DEPARTAMENTOS TMDB -> CINENACIONAL
// ============================================================================

export const DEPARTMENT_MAP: Record<string, string> = {
    'Directing': 'DIRECCION',
    'Production': 'PRODUCCION',
    'Writing': 'GUION',
    'Camera': 'FOTOGRAFIA',
    'Editing': 'MONTAJE',
    'Sound': 'SONIDO',
    'Art': 'ARTE',
    'Costume & Make-Up': 'VESTUARIO',
    'Visual Effects': 'POSTPRODUCCION',
    'Lighting': 'FOTOGRAFIA',
    'Crew': 'OTROS',
};

// ============================================================================
// MAPEO DE JOBS TMDB -> ROLE_ID DE CINENACIONAL
// ============================================================================

export const JOB_TO_ROLE_ID: Record<string, number> = {
    'Director': 2,
    'Director of Photography': 526,
    'Cinematography': 526,
    'Screenplay': 3,
    'Writer': 3,
    'Co-Writer': 939,
    'Story': 927,
    'Idea': 553,
    'Producer': 689,
    'Executive Producer': 703,
    'Associate Producer': 712,
    'Production Assistant': 217,
    'Production Supervisor': 798,
    'Production Coordinator': 354,
    'Production Manager': 401,
    'Post Production Coordinator': 351,
    "Producer's Assistant": 217,
    'Editor': 636,
    'Additional Editor': 637,
    'Original Music Composer': 641,
    'Music': 641,
    'Production Design': 836,
    'Art Direction': 836,
    'Set Decoration': 840,
    'Art Department Assistant': 866,
    'Art Department Coordinator': 342,
    'Art Department Trainee': 868,
    'Costume Design': 835,
    'Costumer': 835,
    'Assistant Costume Designer': 841,
    'Makeup Artist': 838,
    'Makeup Effects': 598,
    'Makeup Effects Designer': 598,
    'Special Effects Makeup Artist': 598,
    'Hairstylist': 839,
    'Sound Designer': 444,
    'Sound Mixer': 629,
    'Sound': 767,
    'Sound Director': 402,
    'Sound Assistant': 223,
    'Boom Operator': 631,
    'Assistant Director': 4,
    'Third Assistant Director': 26,
    'Continuity': 337,
    'Focus Puller': 521,
    'Gaffer': 538,
    'Electrician': 478,
    'Lighting Technician': 478,
    'Camera Operator': 272,
    'Additional Camera': 273,
    'Additional Director of Photography': 528,
    'Clapper Loader': 237,
    'Colorist': 318,
    'Color Grading': 316,
    'Still Photographer': 524,
    'Casting': 392,
    'Location Manager': 571,
    'Assistant Location': 210,
    'Assistant Property Master': 887,
    'VFX Supervisor': 904,
    'Administration': 105,
    'Animation': 111,
    'Animation Director': 388,
};

// Jobs que mapean a múltiples roles (deben crear múltiples registros)
export const JOB_TO_MULTIPLE_ROLES: Record<string, number[]> = {
    'Makeup & Hair': [838, 839],           // Maquillaje y Peinados
    'Makeup & Hair Assistant': [845, 883], // Asistente de Maquillaje y Asistente de Peinados
};

// ============================================================================
// MAPEO DE PAÍSES ISO -> NOMBRE EN CASTELLANO
// ============================================================================

export const ISO_TO_COUNTRY_NAME: Record<string, string> = {
    'AR': 'Argentina',
    'UY': 'Uruguay',
    'BR': 'Brasil',
    'CL': 'Chile',
    'MX': 'México',
    'ES': 'España',
    'US': 'Estados Unidos',
    'FR': 'Francia',
    'IT': 'Italia',
    'DE': 'Alemania',
    'GB': 'Reino Unido',
    'CO': 'Colombia',
    'PE': 'Perú',
    'VE': 'Venezuela',
    'BO': 'Bolivia',
    'PY': 'Paraguay',
    'EC': 'Ecuador',
    'CU': 'Cuba',
    'PR': 'Puerto Rico',
    'DO': 'República Dominicana',
    'CR': 'Costa Rica',
    'PA': 'Panamá',
    'GT': 'Guatemala',
    'HN': 'Honduras',
    'SV': 'El Salvador',
    'NI': 'Nicaragua',
    'PT': 'Portugal',
    'CA': 'Canadá',
    'AU': 'Australia',
    'NZ': 'Nueva Zelanda',
    'JP': 'Japón',
    'CN': 'China',
    'KR': 'Corea del Sur',
    'IN': 'India',
    'RU': 'Rusia',
    'PL': 'Polonia',
    'NL': 'Países Bajos',
    'BE': 'Bélgica',
    'CH': 'Suiza',
    'AT': 'Austria',
    'SE': 'Suecia',
    'NO': 'Noruega',
    'DK': 'Dinamarca',
    'FI': 'Finlandia',
    'IE': 'Irlanda',
    'IL': 'Israel',
    'ZA': 'Sudáfrica',
};

// ============================================================================
// MAPEO DE STATUS TMDB -> STAGE CINENACIONAL
// ============================================================================

export const TMDB_STATUS_TO_STAGE: Record<string, string> = {
    'Released': 'COMPLETA',
    'Post Production': 'EN_POSTPRODUCCION',
    'In Production': 'EN_RODAJE',
    'Planned': 'EN_DESARROLLO',
    'Canceled': 'INCONCLUSA',
    'Rumored': 'EN_DESARROLLO',
};

// ============================================================================
// TIPOS COMPARTIDOS
// ============================================================================

export interface TMDBMovieDetails {
    id: number;
    title: string;
    original_title: string;
    original_language: string;
    overview: string;
    release_date: string;
    runtime: number | null;
    status: string;
    poster_path: string | null;
    genres: Array<{ id: number; name: string }>;
    production_countries: Array<{ iso_3166_1: string; name: string }>;
    credits: {
        cast: TMDBCastMember[];
        crew: TMDBCrewMember[];
    };
    translations: {
        translations: Array<{
            iso_3166_1: string;
            iso_639_1: string;
            data: {
                title: string;
                overview: string;
            };
        }>;
    };
}

export interface TMDBCastMember {
    id: number;
    name: string;
    character: string;
    order: number;
    known_for_department: string;
}

export interface TMDBCrewMember {
    id: number;
    name: string;
    job: string;
    department: string;
    known_for_department: string;
}

export interface LocalPerson {
    id: number;
    first_name: string | null;
    last_name: string | null;
    tmdb_id: number | null;
    birth_year: number | null;
    death_year: number | null;
}

export interface ImportResult {
    tmdb_id: number;
    title: string;
    status: 'success' | 'error' | 'skipped';
    movie_id?: number;
    message: string;
    cast_imported: number;
    crew_imported: number;
    people_created: number;
    people_found: number;
    people_needs_review: number;
}

export interface NameSplitResult {
    firstName: string;
    lastName: string;
    gender: 'MALE' | 'FEMALE' | null;
    needsReview: boolean;
    reviewReason?: string;
}

export interface PersonForReview {
    tmdb_id: number;
    full_name: string;
    first_name: string;
    last_name: string;
    gender: 'MALE' | 'FEMALE' | null;
    reason: string;
    movie_title: string;
    role: string;
}

export interface PersonMatchResult {
    status: 'found' | 'create' | 'review';
    tmdb_id: number;
    name: string;
    local_id?: number;
    firstName?: string;
    lastName?: string;
    gender?: 'MALE' | 'FEMALE' | null;
    reason?: string;
}
