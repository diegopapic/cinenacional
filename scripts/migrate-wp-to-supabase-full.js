// migrate-wp-to-supabase-full.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuración MySQL local
const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '', // Tu contraseña de MySQL
    database: 'wordpress_cine',
    port: 3306
};

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapa de IDs de WordPress a países para coproducción
const countryIdMap = {
  "7362": { name: "España", slug: "espana", code: "ES" },
  "7363": { name: "Perú", slug: "peru", code: "PE" },
  "7364": { name: "Francia", slug: "francia", code: "FR" },
  "7365": { name: "Uruguay", slug: "uruguay", code: "UY" },
  "7366": { name: "Alemania", slug: "alemania", code: "DE" },
  "7367": { name: "Chile", slug: "chile", code: "CL" },
  "7368": { name: "Italia", slug: "italia", code: "IT" },
  "7369": { name: "Corea del Sur", slug: "corea-del-sur", code: "KR" },
  "7370": { name: "Bolivia", slug: "bolivia", code: "BO" },
  "7371": { name: "Paraguay", slug: "paraguay", code: "PY" },
  "7372": { name: "Brasil", slug: "brasil", code: "BR" },
  "7373": { name: "Venezuela", slug: "venezuela", code: "VE" },
  "7374": { name: "Suiza", slug: "suiza", code: "CH" },
  "7375": { name: "Panamá", slug: "panama", code: "PA" },
  "7376": { name: "Suecia", slug: "suecia", code: "SE" },
  "7377": { name: "Canadá", slug: "canada", code: "CA" },
  "7378": { name: "Países Bajos", slug: "pa-ses-bajos", code: "NL" },
  "7379": { name: "Estados Unidos", slug: "estados-unidos", code: "US" },
  "7380": { name: "Taiwán", slug: "taiwan", code: "TW" },
  "7381": { name: "México", slug: "mexico", code: "MX" },
  "7382": { name: "Inglaterra", slug: "inglaterra", code: "GB" },
  "7383": { name: "Polonia", slug: "polonia", code: "PL" },
  "7384": { name: "República Checa", slug: "republica-checa", code: "CZ" },
  "7385": { name: "Bélgica", slug: "belgica", code: "BE" },
  "7386": { name: "Australia", slug: "australia", code: "AU" },
  "7387": { name: "Austria", slug: "austria", code: "AT" },
  "7388": { name: "República Dominicana", slug: "republica-dominicana", code: "DO" },
  "7389": { name: "Catar", slug: "catar", code: "QA" },
  "7390": { name: "Cuba", slug: "cuba", code: "CU" },
  "7391": { name: "Rumania", slug: "rumania", code: "RO" },
  "7396": { name: "China", slug: "china", code: "CN" },
  "7397": { name: "Ecuador", slug: "ecuador", code: "EC" },
  "7399": { name: "Dinamarca", slug: "dinamarca", code: "DK" },
  "7400": { name: "Noruega", slug: "noruega", code: "NO" },
  "7402": { name: "Portugal", slug: "portugal", code: "PT" },
  "7403": { name: "Túnez", slug: "tunez", code: "TN" },
  "7404": { name: "Reino Unido", slug: "reino-unido", code: "GB" },
  "7407": { name: "Puerto Rico", slug: "puerto-rico", code: "PR" },
  "7408": { name: "Grecia", slug: "grecia", code: "GR" },
  "7410": { name: "Guatemala", slug: "guatemala", code: "GT" },
  "7412": { name: "India", slug: "india", code: "IN" },
  "7413": { name: "Yugoslavia", slug: "yugoslavia", code: "YU" },
  "7417": { name: "Turquía", slug: "turquia", code: "TR" },
  "7418": { name: "Mali", slug: "mali", code: "ML" },
  "7419": { name: "Japón", slug: "japon", code: "JP" },
  "7420": { name: "Finlandia", slug: "finlandia", code: "FI" },
  "7421": { name: "Irán", slug: "iran", code: "IR" },
  "7422": { name: "Israel", slug: "israel", code: "IL" },
  "7424": { name: "Nueva Zelanda", slug: "nueva-zelanda", code: "NZ" },
  "7425": { name: "Costa Rica", slug: "costa-rica", code: "CR" },
  "7426": { name: "Guinea", slug: "guinea", code: "GN" },
  "7428": { name: "Angola", slug: "angola", code: "AO" },
  "7429": { name: "Etiopía", slug: "etiopia", code: "ET" },
  "7430": { name: "Eslovenia", slug: "eslovenia", code: "SI" },
  "7431": { name: "Palestina", slug: "palestina", code: "PS" },
  "7432": { name: "Nueva Caledonia", slug: "nueva-caledonia", code: "NC" },
  "7436": { name: "Marruecos", slug: "marruecos", code: "MA" },
  "7437": { name: "Islandia", slug: "islandia", code: "IS" },
  "7438": { name: "Namibia", slug: "namibia", code: "NA" },
  "7439": { name: "Burkina Faso", slug: "burkina-faso", code: "BF" },
  "7440": { name: "Sudáfrica", slug: "sudafrica", code: "ZA" },
  "7887": { name: "Colombia", slug: "colombia", code: "CO" },
  "8166": { name: "Serbia", slug: "serbia", code: "RS" },
  "9082": { name: "Honduras", slug: "honduras", code: "HN" },
  "9087": { name: "Singapur", slug: "singapur", code: "SG" },
  "9120": { name: "Bulgaria", slug: "bulgaria", code: "BG" },
  "11229": { name: "Argentina", slug: "argentina", code: "AR" }
};

// Mapeo de IDs de WordPress a slugs de color_types
const WP_COLOR_MAPPING = {
    '9214': 'blanco-y-negro',           // Blanco y Negro
    '5': 'color',                        // Color
    '9212': 'color-eastmancolor',       // Color (Eastmancolor)
    '9300': 'blanco-y-negro-color',     // Blanco y Negro / Color
    '9260': 'color-ferraniacolor',      // Color (FerraniaColor)
    '9219': 'color-agfacolor',          // Color (Agfacolor)
    '9249': 'color-fujicolor',          // Color (FujiColor)
    '9315': 'color-technicolor',        // Color (Technicolor)
    '9289': 'color-gevacolor',          // Color (GevaColor)
    '9325': 'color-kodak-color',        // Color (Kodak Color)
    '9247': 'color-super-eastmancolor', // Color (Super Eastmancolor)
    '9229': 'n-d'                        // n/d
};

// Mapeo de valores de sonido desde postmeta
const WP_SOUND_MAPPING = {
    '3': 'sonora',    // Sonora (10,390 películas)
    '2': 'muda',      // Muda (172 películas)
    '1': 'n-d'        // n/d - no disponible (20 películas)
};

// Mapeo de códigos de clasificación a nombres históricos
const WP_CLASSIFICATION_MAPPING = {
    '1': null,      // Sin mapeo claro
    '2': 'ATP',
    '3': null,      // Sin mapeo claro
    '4': 'Inconveniente para menores de 14',
    '5': 'Inconveniente para menores de 16',
    '6': 'Inconveniente para menores de 18',
    '7': 'Inconveniente para niños',
    '8': 'No apta para menores de 14',
    '9': 'No apta para menores de 16',
    '10': 'No apta para menores de 18',
    '11': 'Prohibida para menores de 13',
    '12': 'Prohibida para menores de 14',
    '13': 'Prohibida para menores de 16',
    '14': 'Prohibida para menores de 18',
    '15': 'SAM13',
    '16': 'SAM13 C/R',
    '17': 'SAM14',
    '18': 'SAM15',
    '19': 'SAM16',
    '20': 'SAM16 C/R',
    '21': 'SAM18',
    '22': 'SAM18 C/R',
    '23': 'Sin restricciones',
    '24': 'ATP C/R',
    // Mapeos directos para valores textuales
    'ATP': 'ATP',
    'SAM13': 'SAM13',
    'SAM14': 'SAM14',
    'SAM15': 'SAM15',
    'SAM16': 'SAM16',
    'SAM18': 'SAM18',
    'SAM13 C/R': 'SAM13 C/R',
    'SAM16 C/R': 'SAM16 C/R',
    'SAM18 C/R': 'SAM18 C/R',
    'ATP C/R': 'ATP C/R',
    'Inconveniente para menores de 14': 'Inconveniente para menores de 14',
    'Inconveniente para menores de 16': 'Inconveniente para menores de 16',
    'Inconveniente para menores de 18': 'Inconveniente para menores de 18',
    'Inconveniente para niños': 'Inconveniente para niños',
    'No apta para menores de 14': 'No apta para menores de 14',
    'No apta para menores de 16': 'No apta para menores de 16',
    'No apta para menores de 18': 'No apta para menores de 18',
    'Prohibida para menores de 13': 'Prohibida para menores de 13',
    'Prohibida para menores de 14': 'Prohibida para menores de 14',
    'Prohibida para menores de 16': 'Prohibida para menores de 16',
    'Prohibida para menores de 18': 'Prohibida para menores de 18',
    'Sin restricciones': 'Sin restricciones',
    'Condicionada': 'Condicionada',
    'n/d': null  // No disponible = null
};

// Logger mejorado con soporte para clasificaciones y coproducción
class MigrationLogger {
    constructor() {
        this.logs = {
            start: new Date(),
            movies: [],
            errors: [],
            colors: {
                mapped: 0,
                notFound: 0,
                errors: 0
            },
            sound: {
                mapped: 0,
                notFound: 0,
                errors: 0
            },
            classification: {
                mapped: 0,
                notFound: 0,
                fromTaxonomy: 0,
                fromMeta: 0,
                null: 0
            },
            coproduction: {
                total: 0,
                migrated: 0,
                errors: 0,
                countriesCreated: 0,
                countriesExisting: 0
            },
            summary: {}
        };
    }

    logMovie(movie, status, error = null) {
        this.logs.movies.push({
            wpId: movie.ID,
            title: movie.post_title,
            status,
            error: error?.message,
            timestamp: new Date()
        });
    }

    logColor(movieTitle, colorName, status) {
        if (status === 'mapped') this.logs.colors.mapped++;
        else if (status === 'not_found') this.logs.colors.notFound++;
        else if (status === 'error') this.logs.colors.errors++;
    }

    logSound(movieTitle, soundValue, status) {
        if (status === 'mapped') this.logs.sound.mapped++;
        else if (status === 'not_found') this.logs.sound.notFound++;
        else if (status === 'error') this.logs.sound.errors++;
    }

    logClassification(movieTitle, code, classification, source) {
        if (classification) {
            this.logs.classification.mapped++;
            if (source === 'taxonomy') {
                this.logs.classification.fromTaxonomy++;
            } else {
                this.logs.classification.fromMeta++;
            }
        } else if (code === 'n/d' || !code) {
            this.logs.classification.null++;
        } else {
            this.logs.classification.notFound++;
            console.warn(`⚠️  Clasificación no mapeada: código "${code}" para "${movieTitle}"`);
        }
    }

    logCoproduction(type, count = 1) {
        if (type === 'total') this.logs.coproduction.total = count;
        else if (type === 'migrated') this.logs.coproduction.migrated += count;
        else if (type === 'error') this.logs.coproduction.errors += count;
        else if (type === 'country_created') this.logs.coproduction.countriesCreated += count;
        else if (type === 'country_existing') this.logs.coproduction.countriesExisting += count;
    }

    save() {
        fs.writeFileSync('wp-complete-migration-log.json', JSON.stringify(this.logs, null, 2));
    }
}

const logger = new MigrationLogger();

// Funciones auxiliares
function createSlug(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

function cleanTitle(title) {
    return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

function extractYearFromTitle(title) {
    const match = title.match(/\((\d{4})\)$/);
    return match ? parseInt(match[1]) : null;
}

function parseReleaseDate(dateString) {
    if (!dateString) return null;

    // Manejar formato YYYYMMDD de WordPress
    if (/^\d{8}$/.test(dateString)) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);

        // Validar que los valores sean razonables
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);

        if (yearNum < 1800 || yearNum > 2100 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
            console.warn(`⚠️  Fecha con valores fuera de rango: ${dateString}`);
            return null;
        }

        // Construir fecha en formato YYYY-MM-DD
        return `${year}-${month}-${day}`;
    }

    // Si no es formato YYYYMMDD, intentar parsear como fecha normal
    const date = new Date(dateString);

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
        console.warn(`⚠️  Fecha inválida: ${dateString}`);
        return null;
    }

    // Formatear a YYYY-MM-DD para PostgreSQL
    return date.toISOString().split('T')[0];
}

// Función para generar abreviación cuando no existe
function generateAbbreviation(name) {
    // Casos especiales conocidos
    const specialCases = {
        'Sin restricciones': 'SR',
        'Condicionada': 'COND'
    };

    if (specialCases[name]) {
        return specialCases[name];
    }

    // Para clasificaciones históricas con edad
    const ageMatch = name.match(/(\d+)/);
    if (ageMatch) {
        const age = ageMatch[1];
        if (name.includes('Inconveniente')) {
            return `IM${age}`;
        } else if (name.includes('No apta')) {
            return `NAM${age}`;
        } else if (name.includes('Prohibida')) {
            return `PM${age}`;
        }
    }

    // Para "Inconveniente para niños"
    if (name === 'Inconveniente para niños') {
        return 'IN';
    }

    // Fallback: usar las primeras letras de cada palabra significativa
    const words = name.split(' ').filter(w =>
        !['para', 'de', 'los', 'las', 'el', 'la', 'y'].includes(w.toLowerCase())
    );

    if (words.length >= 2) {
        return words.map(w => w[0].toUpperCase()).join('');
    }

    // Si todo falla, usar los primeros 5 caracteres
    return name.substring(0, 5).toUpperCase();
}

// Función para determinar si es abreviación o nombre completo
function parseRatingNameAndAbbreviation(ratingText) {
    // Patrones de abreviaciones conocidas
    const abbreviationPatterns = [
        /^ATP$/,
        /^ATP C\/R$/,
        /^SAM\d+$/,
        /^SAM\d+ C\/R$/
    ];

    // Verificar si es una abreviación
    const isAbbreviation = abbreviationPatterns.some(pattern => pattern.test(ratingText));

    if (isAbbreviation) {
        // Es una abreviación, necesitamos expandir el nombre
        const nameMap = {
            'ATP': 'Apta para todo público',
            'ATP C/R': 'Apta para todo público (con reservas)',
            'SAM13': 'Solo apta para mayores de 13 años',
            'SAM13 C/R': 'Solo apta para mayores de 13 años (con reservas)',
            'SAM14': 'Solo apta para mayores de 14 años',
            'SAM15': 'Solo apta para mayores de 15 años',
            'SAM16': 'Solo apto para mayores de 16 años',
            'SAM16 C/R': 'Solo apta para mayores de 16 años (con reservas)',
            'SAM18': 'Solo apta para mayores de 18 años',
            'SAM18 C/R': 'Solo apta para mayores de 18 años (con reservas)'
        };

        return {
            name: nameMap[ratingText] || ratingText,
            abbreviation: ratingText
        };
    } else {
        // Es un nombre completo, generar abreviación
        return {
            name: ratingText,
            abbreviation: generateAbbreviation(ratingText)
        };
    }
}

// Función para obtener todas las clasificaciones únicas de WordPress
async function getAllUniqueRatings(connection) {
    console.log('🎬 Obteniendo todas las clasificaciones únicas de WordPress...');

    // 1. Obtener clasificaciones desde taxonomía
    const [taxonomyRatings] = await connection.execute(`
    SELECT DISTINCT
      t.name as rating_name,
      t.slug,
      COUNT(DISTINCT tr.object_id) as usage_count
    FROM wp_terms t
    INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
    INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
    INNER JOIN wp_posts p ON tr.object_id = p.ID
    WHERE tt.taxonomy = 'clasificacion'
      AND p.post_type = 'pelicula'
      AND p.post_status IN ('publish', 'draft')
    GROUP BY t.name, t.slug
    ORDER BY usage_count DESC
  `);

    // 2. Obtener clasificaciones desde meta (códigos mapeados)
    const [metaRatings] = await connection.execute(`
    SELECT 
      pm.meta_value as code,
      COUNT(DISTINCT p.ID) as usage_count
    FROM wp_postmeta pm
    INNER JOIN wp_posts p ON pm.post_id = p.ID
    WHERE pm.meta_key = 'clasificacion'
      AND p.post_type = 'pelicula'
      AND p.post_status IN ('publish', 'draft')
      AND pm.meta_value IS NOT NULL
      AND pm.meta_value != ''
      AND pm.meta_value != 'n/d'
    GROUP BY pm.meta_value
    ORDER BY usage_count DESC
  `);

    // Crear set de clasificaciones únicas
    const uniqueRatings = new Map();

    // Agregar clasificaciones de taxonomía
    taxonomyRatings.forEach(rating => {
        if (!uniqueRatings.has(rating.rating_name)) {
            const parsed = parseRatingNameAndAbbreviation(rating.rating_name);
            uniqueRatings.set(rating.rating_name, {
                name: parsed.name,
                abbreviation: parsed.abbreviation,
                original_value: rating.rating_name,
                slug: rating.slug,
                usage_count: rating.usage_count,
                source: 'taxonomy'
            });
        }
    });

    // Agregar clasificaciones mapeadas desde meta
    metaRatings.forEach(meta => {
        const mappedName = WP_CLASSIFICATION_MAPPING[meta.code];
        if (mappedName && !uniqueRatings.has(mappedName)) {
            const parsed = parseRatingNameAndAbbreviation(mappedName);
            uniqueRatings.set(mappedName, {
                name: parsed.name,
                abbreviation: parsed.abbreviation,
                original_value: mappedName,
                slug: createSlug(mappedName),
                usage_count: meta.usage_count,
                source: 'meta',
                code: meta.code
            });
        }
    });

    console.log(`✅ ${uniqueRatings.size} clasificaciones únicas encontradas\n`);

    return Array.from(uniqueRatings.values());
}

// Función para migrar ratings a Supabase
async function migrateRatings(connection, supabase) {
    console.log('\n🎬 MIGRANDO CLASIFICACIONES (RATINGS)\n');

    // Obtener todas las clasificaciones únicas
    const uniqueRatings = await getAllUniqueRatings(connection);

    // Verificar ratings existentes en Supabase
    console.log('📊 Verificando ratings existentes en Supabase...');
    const { data: existingRatings, error: fetchError } = await supabase
        .from('ratings')
        .select('id, name, abbreviation');

    if (fetchError) {
        console.error('❌ Error al obtener ratings:', fetchError);
        throw fetchError;
    }

    // Crear mapa de ratings existentes - usar original_value para la búsqueda
    const existingRatingsMap = new Map();
    const originalValueToId = new Map();

    existingRatings.forEach(rating => {
        existingRatingsMap.set(rating.name, rating);
        // También mapear por abbreviation si existe
        if (rating.abbreviation) {
            originalValueToId.set(rating.abbreviation, rating.id);
        }
        originalValueToId.set(rating.name, rating.id);
    });

    console.log(`✅ ${existingRatings.length} ratings ya existen en Supabase\n`);

    // Preparar ratings para insertar
    const ratingsToInsert = [];
    const now = new Date().toISOString();

    // Determinar qué ratings necesitan ser insertados
    uniqueRatings.forEach(rating => {
        // Buscar por el valor original (puede ser nombre o abreviación)
        if (!originalValueToId.has(rating.original_value)) {
            ratingsToInsert.push({
                name: rating.name,
                abbreviation: rating.abbreviation,
                slug: createSlug(rating.name),
                description: `Clasificación ${rating.source === 'taxonomy' ? 'oficial' : 'histórica'}: ${rating.name}`,
                created_at: now,
                updated_at: now
            });
        }
    });

    // Insertar nuevos ratings si hay alguno
    if (ratingsToInsert.length > 0) {
        console.log(`📝 Insertando ${ratingsToInsert.length} nuevas clasificaciones...\n`);

        // Insertar en lotes de 100
        const batchSize = 100;
        for (let i = 0; i < ratingsToInsert.length; i += batchSize) {
            const batch = ratingsToInsert.slice(i, i + batchSize);

            const { data: insertedRatings, error: insertError } = await supabase
                .from('ratings')
                .insert(batch)
                .select();

            if (insertError) {
                console.error('❌ Error al insertar ratings:', insertError);
                throw insertError;
            }

            // Agregar al mapa los recién insertados
            insertedRatings.forEach(rating => {
                originalValueToId.set(rating.name, rating.id);
                if (rating.abbreviation) {
                    originalValueToId.set(rating.abbreviation, rating.id);
                }
            });

            console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${insertedRatings.length} ratings insertados`);
        }
    } else {
        console.log('ℹ️  No hay nuevas clasificaciones para insertar\n');
    }

    // IMPORTANTE: Limpiar el mapa y reconstruirlo con TODOS los ratings
    originalValueToId.clear();

    // Obtener TODOS los ratings actuales de la base
    const { data: allCurrentRatings, error: refreshError } = await supabase
        .from('ratings')
        .select('id, name, abbreviation');

    if (refreshError) {
        console.error('❌ Error al refrescar ratings:', refreshError);
        throw refreshError;
    }

    // Reconstruir el mapa con los IDs reales
    allCurrentRatings.forEach(rating => {
        originalValueToId.set(rating.name, rating.id);
        originalValueToId.set(rating.abbreviation, rating.id);
    });

    console.log(`\n✅ Mapa actualizado con ${originalValueToId.size} valores`);

    return originalValueToId;
}

// Función principal de migración completa
async function migrateComplete() {
    let connection;

    try {
        console.log('🚀 Iniciando migración completa MySQL → Supabase\n');

        // Conectar a MySQL
        console.log('🔌 Conectando a MySQL local...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ Conectado a MySQL\n');

        // Verificar conexión Supabase
        console.log('🔌 Verificando Supabase...');
        const { count } = await supabase
            .from('movies')
            .select('*', { count: 'exact', head: true });
        console.log(`✅ Conectado a Supabase (${count} películas actuales)\n`);

        // Limpiar tablas antes de migrar (opcional)
        if (process.argv.includes('--clean')) {
            console.log('🧹 Limpiando tablas...');

            // Limpiar movie_countries
            const { error: deleteMovieCountriesError } = await supabase
                .from('movie_countries')
                .delete()
                .neq('movie_id', 0);

            if (deleteMovieCountriesError) {
                console.error('❌ Error al limpiar tabla movie_countries:', deleteMovieCountriesError);
            } else {
                console.log('✅ Tabla movie_countries limpiada');
            }

            // Limpiar countries
            const { error: deleteCountriesError } = await supabase
                .from('countries')
                .delete()
                .neq('id', 0);

            if (deleteCountriesError) {
                console.error('❌ Error al limpiar tabla countries:', deleteCountriesError);
            } else {
                console.log('✅ Tabla countries limpiada');
            }

            // Limpiar movies
            const { error: deleteMoviesError } = await supabase
                .from('movies')
                .delete()
                .neq('id', 0);

            if (deleteMoviesError) {
                console.error('❌ Error al limpiar tabla movies:', deleteMoviesError);
                throw deleteMoviesError;
            }
            console.log('✅ Tabla movies limpiada');

            // Limpiar ratings
            const { error: deleteRatingsError } = await supabase
                .from('ratings')
                .delete()
                .neq('id', 0);

            if (deleteRatingsError) {
                console.error('❌ Error al limpiar tabla ratings:', deleteRatingsError);
                throw deleteRatingsError;
            }
            console.log('✅ Tabla ratings limpiada\n');
        }

        // PRIMERO: Migrar todas las clasificaciones
        const originalValueToId = await migrateRatings(connection, supabase);

        // SEGUNDO: Crear/verificar todos los países
        console.log('\n🌍 CREANDO/VERIFICANDO PAÍSES\n');
        const countryCache = {}; // Cache de country_id por código
        
        for (const [wpId, country] of Object.entries(countryIdMap)) {
            // Verificar si el país ya existe
            const { data: existingCountry } = await supabase
                .from('countries')
                .select('id')
                .eq('code', country.code)
                .single();

            if (existingCountry) {
                countryCache[country.code] = existingCountry.id;
                console.log(`   ✓ País existente: ${country.name} (ID: ${existingCountry.id})`);
                logger.logCoproduction('country_existing');
            } else {
                // Crear el país
                const { data: newCountry, error } = await supabase
                    .from('countries')
                    .insert({
                        code: country.code,
                        name: country.name
                    })
                    .select('id')
                    .single();

                if (error) {
                    console.error(`   ✗ Error creando ${country.name}:`, error.message);
                } else {
                    countryCache[country.code] = newCountry.id;
                    console.log(`   ✓ País creado: ${country.name} (ID: ${newCountry.id})`);
                    logger.logCoproduction('country_created');
                }
            }
        }
        console.log(`\n✅ ${Object.keys(countryCache).length} países listos para usar\n`);

        // Obtener mapeo de color_types desde Supabase
        console.log('🎨 Obteniendo tipos de color desde Supabase...');
        const { data: colorTypes, error: colorError } = await supabase
            .from('color_types')
            .select('id, slug');

        if (colorError) throw colorError;

        // Crear mapa slug -> id
        const colorTypeMap = {};
        colorTypes.forEach(ct => {
            colorTypeMap[ct.slug] = ct.id;
        });

        console.log(`✅ ${colorTypes.length} tipos de color encontrados\n`);

        // Obtener películas de MySQL con información completa incluyendo coproducción
        console.log('📊 Obteniendo películas de WordPress con todos los datos...');
        const [movies] = await connection.execute(`
      SELECT 
        p.*,
        -- Campos meta existentes
        pm_year.meta_value as year_meta,
        pm_duration.meta_value as duration_meta,
        pm_original.meta_value as original_title_meta,
        pm_release_date.meta_value as release_date_meta,
        pm_sound.meta_value as sound_meta,
        -- Clasificación
        pm_classification.meta_value as classification_meta,
        -- Coproducción
        pm_coproduction.meta_value as coproduction_data,
        -- Color desde taxonomía
        t_color.term_id as color_term_id,
        t_color.name as color_name,
        t_color.slug as color_slug,
        -- Clasificación desde taxonomía
        t_class.name as classification_taxonomy_name,
        t_class.term_id as classification_term_id
      FROM wp_posts p
      -- Meta fields existentes
      LEFT JOIN wp_postmeta pm_year 
        ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_postmeta pm_duration 
        ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
      LEFT JOIN wp_postmeta pm_original 
        ON p.ID = pm_original.post_id AND pm_original.meta_key = 'titulo_original'
      LEFT JOIN wp_postmeta pm_release_date 
        ON p.ID = pm_release_date.post_id AND pm_release_date.meta_key = 'fecha_de_estreno'
      LEFT JOIN wp_postmeta pm_sound 
        ON p.ID = pm_sound.post_id AND pm_sound.meta_key = 'sonido'
      -- Clasificación meta
      LEFT JOIN wp_postmeta pm_classification 
        ON p.ID = pm_classification.post_id AND pm_classification.meta_key = 'clasificacion'
      -- Coproducción meta
      LEFT JOIN wp_postmeta pm_coproduction 
        ON p.ID = pm_coproduction.post_id AND pm_coproduction.meta_key = 'coproduccion'
      -- Color taxonomy
      LEFT JOIN wp_term_relationships tr_color 
        ON p.ID = tr_color.object_id
      LEFT JOIN wp_term_taxonomy tt_color 
        ON tr_color.term_taxonomy_id = tt_color.term_taxonomy_id AND tt_color.taxonomy = 'color'
      LEFT JOIN wp_terms t_color 
        ON tt_color.term_id = t_color.term_id
      -- Clasificación taxonomy
      LEFT JOIN wp_term_relationships tr_class 
        ON p.ID = tr_class.object_id
      LEFT JOIN wp_term_taxonomy tt_class 
        ON tr_class.term_taxonomy_id = tt_class.term_taxonomy_id AND tt_class.taxonomy = 'clasificacion'
      LEFT JOIN wp_terms t_class 
        ON tt_class.term_id = t_class.term_id
      WHERE p.post_type = 'pelicula' 
      AND p.post_status IN ('publish', 'draft')
      ORDER BY p.ID
    `);

        console.log(`✅ ${movies.length} registros encontrados\n`);

        // Agrupar por película (puede haber duplicados por múltiples colores)
        const moviesMap = new Map();
        movies.forEach(movie => {
            if (!moviesMap.has(movie.ID)) {
                moviesMap.set(movie.ID, movie);
            }
        });

        console.log(`📽️  ${moviesMap.size} películas únicas para migrar\n`);

        // Crear mapa para guardar la relación WP ID -> Supabase ID
        const movieIdMap = {};

        // Migrar cada película
        let migrated = 0;
        let errors = 0;

        for (const [wpId, movie] of moviesMap) {
            try {
                // Preparar datos básicos
                const cleanedTitle = cleanTitle(movie.post_title);
                const yearFromTitle = extractYearFromTitle(movie.post_title);
                const year = movie.year_meta || yearFromTitle || new Date().getFullYear();

                // Parsear fecha de estreno
                const releaseDate = parseReleaseDate(movie.release_date_meta);

                // Generar slug único
                let slug = movie.post_name || createSlug(cleanedTitle);

                // Verificar duplicados
                const { data: existing } = await supabase
                    .from('movies')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (existing) {
                    let counter = 1;
                    while (true) {
                        const newSlug = `${slug}-${counter}`;
                        const { data } = await supabase
                            .from('movies')
                            .select('id')
                            .eq('slug', newSlug)
                            .single();
                        if (!data) {
                            slug = newSlug;
                            break;
                        }
                        counter++;
                    }
                }

                // Determinar color_type_id
                let colorTypeId = null;
                if (movie.color_term_id) {
                    const mappedSlug = WP_COLOR_MAPPING[movie.color_term_id.toString()];
                    if (mappedSlug && colorTypeMap[mappedSlug]) {
                        colorTypeId = colorTypeMap[mappedSlug];
                        logger.logColor(cleanedTitle, movie.color_name, 'mapped');
                    } else {
                        console.warn(`⚠️  Color no mapeado: ${movie.color_name} (ID: ${movie.color_term_id})`);
                        logger.logColor(cleanedTitle, movie.color_name, 'not_found');
                    }
                } else {
                    // Si no tiene color, asignar "No disponible"
                    colorTypeId = colorTypeMap['n-d'];
                    logger.logColor(cleanedTitle, 'Sin color', 'mapped');
                }

                // Determinar sound_type
                let soundType = null;
                if (movie.sound_meta) {
                    const mappedSound = WP_SOUND_MAPPING[movie.sound_meta.toString()];
                    if (mappedSound) {
                        // Capitalizar correctamente para que coincida con el dropdown del ABM
                        if (mappedSound === 'sonora') {
                            soundType = 'Sonora';
                        } else if (mappedSound === 'muda') {
                            soundType = 'Muda';
                        } else {
                            soundType = 'n/d'; // o podrías usar null si prefieres
                        }
                        logger.logSound(cleanedTitle, movie.sound_meta, 'mapped');
                    } else {
                        console.warn(`⚠️  Sonido no mapeado: valor ${movie.sound_meta}`);
                        logger.logSound(cleanedTitle, movie.sound_meta, 'not_found');
                        soundType = null; // Por defecto null si no se puede mapear
                    }
                } else {
                    // Si no tiene sonido, dejar como null
                    soundType = null;
                    logger.logSound(cleanedTitle, 'Sin sonido', 'mapped');
                }

                // Determinar rating_id
                let ratingId = null;
                let ratingValue = null;
                let ratingSource = null;

                // SOLO usar clasificación de la taxonomía (más confiable)
                if (movie.classification_taxonomy_name) {
                    ratingValue = movie.classification_taxonomy_name;
                    ratingSource = 'taxonomy';
                }
                // Si no hay en taxonomía, solo procesar códigos numéricos del meta field
                else if (movie.classification_meta && /^\d+$/.test(movie.classification_meta)) {
                    // Solo procesar si es un código numérico (más confiable que texto)
                    const mappedName = WP_CLASSIFICATION_MAPPING[movie.classification_meta];
                    if (mappedName) {
                        ratingValue = mappedName;
                        ratingSource = 'meta';
                    }
                }

                // Obtener el ID del rating - buscar por el valor original
                if (ratingValue && originalValueToId.has(ratingValue)) {
                    ratingId = originalValueToId.get(ratingValue);
                    logger.logClassification(cleanedTitle, movie.classification_meta, ratingValue, ratingSource);
                } else if (ratingValue) {
                    console.warn(`⚠️  Rating no encontrado en mapa: "${ratingValue}"`);
                    logger.logClassification(cleanedTitle, movie.classification_meta, null, 'not_found');
                } else {
                    logger.logClassification(cleanedTitle, movie.classification_meta, null, null);
                }

                // Procesar países de coproducción
                const countryNames = ['Argentina']; // Siempre incluir Argentina
                let isCoproduction = false;
                let productionType = 'national';
                
                if (movie.coproduction_data) {
                    // Extraer IDs de países del valor serializado
                    const matches = movie.coproduction_data.match(/s:\d+:"(\d+)"/g);
                    
                    if (matches && matches.length > 0) {
                        matches.forEach(match => {
                            const wpCountryId = match.match(/s:\d+:"(\d+)"/)[1];
                            if (countryIdMap[wpCountryId] && countryIdMap[wpCountryId].name !== 'Argentina') {
                                countryNames.push(countryIdMap[wpCountryId].name);
                            }
                        });
                        
                        if (countryNames.length > 1) {
                            isCoproduction = true;
                            productionType = 'coproduction';
                        }
                    }
                }

                // Datos para Supabase
                const movieData = {
                    title: cleanedTitle,
                    slug: slug,
                    year: parseInt(year),
                    release_date: releaseDate,
                    status: movie.post_status === 'publish' ? 'PUBLISHED' : 'DRAFT',
                    synopsis: movie.post_content || null,
                    meta_description: movie.post_excerpt || null,
                    created_at: movie.post_date,
                    updated_at: movie.post_modified,
                    // Campos adicionales
                    original_title: movie.original_title_meta || null,
                    duration: movie.duration_meta ? parseInt(movie.duration_meta) : null,
                    // Color migrado
                    color_type_id: colorTypeId,
                    // Sonido migrado
                    sound_type: soundType,
                    // Clasificación migrada
                    rating_id: ratingId,
                    // Campos de coproducción
                    countries: countryNames,
                    is_coproduction: isCoproduction,
                    production_type: productionType,
                    // Valores por defecto
                    duration_seconds: null,
                    tipo_duracion: null,
                    tagline: null,
                    poster_url: null,
                    trailer_url: null,
                    imdb_id: null,
                    data_completeness: 'BASIC_PRESS_KIT',
                    filming_start_date: null,
                    filming_end_date: null,
                    meta_keywords: []
                };

                console.log(`\n📽️  Migrando: "${cleanedTitle}"`);
                console.log(`   - WP ID: ${movie.ID}`);
                console.log(`   - Slug: ${slug}`);
                console.log(`   - Año: ${movieData.year}`);
                console.log(`   - Color: ${movie.color_name || 'No disponible'}`);
                console.log(`   - Sonido: ${soundType}`);
                console.log(`   - Clasificación: ${ratingValue || 'No especificada'} (ID: ${ratingId || 'N/A'}, fuente: ${ratingSource || 'N/A'})`);
                console.log(`   - Fecha de estreno: ${releaseDate || 'No especificada'}`);
                console.log(`   - Países: ${countryNames.join(', ')}`);
                console.log(`   - Tipo: ${productionType}`);

                // Insertar en Supabase
                const { data, error } = await supabase
                    .from('movies')
                    .insert([movieData])
                    .select()
                    .single();

                if (error) throw error;

                console.log(`   ✅ Migrada con ID: ${data.id}`);
                
                // Inmediatamente después de crear la película, agregar las relaciones de países
                // Siempre agregar Argentina como país principal
                const argentinaCode = 'AR';
                if (countryCache[argentinaCode]) {
                    await supabase
                        .from('movie_countries')
                        .insert({
                            movie_id: data.id,
                            country_id: countryCache[argentinaCode],
                            is_primary: true
                        });
                }

                // Agregar países coproductores
                if (movie.coproduction_data) {
                    const matches = movie.coproduction_data.match(/s:\d+:"(\d+)"/g);
                    
                    if (matches) {
                        for (const match of matches) {
                            const wpCountryId = match.match(/s:\d+:"(\d+)"/)[1];
                            const country = countryIdMap[wpCountryId];
                            
                            if (country && country.code !== 'AR') { // No duplicar Argentina
                                const { error: coprodError } = await supabase
                                    .from('movie_countries')
                                    .insert({
                                        movie_id: data.id,
                                        country_id: countryCache[country.code],
                                        is_primary: false
                                    });
                                
                                if (coprodError && !coprodError.message.includes('duplicate')) {
                                    console.error(`   Error agregando ${country.name}:`, coprodError.message);
                                }
                            }
                        }
                    }
                    logger.logCoproduction('migrated');
                }
                
                // Guardar el mapeo WP ID -> Supabase ID
                movieIdMap[movie.ID] = data.id;
                
                logger.logMovie(movie, 'success');
                migrated++;

            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                logger.logMovie(movie, 'error', error);
                logger.logColor(movie.post_title, movie.color_name, 'error');
                logger.logSound(movie.post_title, movie.sound_meta, 'error');
                errors++;
            }
        }

        // Contar estadísticas de coproducción
        console.log('\n\n🌍 VERIFICANDO COPRODUCCIÓN');
        const [wpMoviesWithCoprod] = await connection.execute(`
            SELECT COUNT(DISTINCT p.ID) as total
            FROM wp_posts p
            JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'pelicula'
            AND pm.meta_key = 'coproduccion'
            AND pm.meta_value != ''
            AND pm.meta_value IS NOT NULL
        `);
        
        logger.logCoproduction('total', wpMoviesWithCoprod[0].total);

        // Resumen
        console.log('\n\n📊 RESUMEN DE MIGRACIÓN COMPLETA');
        console.log('════════════════════════════════');
        console.log(`Total de películas: ${moviesMap.size}`);
        console.log(`✅ Migradas: ${migrated}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('\n🎨 Colores:');
        console.log(`   - Mapeados correctamente: ${logger.logs.colors.mapped}`);
        console.log(`   - No encontrados: ${logger.logs.colors.notFound}`);
        console.log(`   - Errores: ${logger.logs.colors.errors}`);
        console.log('\n🔊 Sonido:');
        console.log(`   - Mapeados correctamente: ${logger.logs.sound.mapped}`);
        console.log(`   - No encontrados: ${logger.logs.sound.notFound}`);
        console.log(`   - Errores: ${logger.logs.sound.errors}`);
        console.log('\n🎬 Clasificaciones:');
        console.log(`   - Mapeadas correctamente: ${logger.logs.classification.mapped}`);
        console.log(`     • Desde taxonomía: ${logger.logs.classification.fromTaxonomy}`);
        console.log(`     • Desde meta: ${logger.logs.classification.fromMeta}`);
        console.log(`   - Sin clasificación: ${logger.logs.classification.null}`);
        console.log(`   - No mapeadas: ${logger.logs.classification.notFound}`);
        console.log('\n🌍 Coproducción:');
        console.log(`   - Total películas con coproducción en WP: ${logger.logs.coproduction.total}`);
        console.log(`   - Migradas correctamente: ${logger.logs.coproduction.migrated}`);
        console.log(`   - Errores: ${logger.logs.coproduction.errors}`);
        console.log(`   - Países creados: ${logger.logs.coproduction.countriesCreated}`);
        console.log(`   - Países existentes: ${logger.logs.coproduction.countriesExisting}`);

        logger.logs.summary = {
            total: moviesMap.size,
            migrated,
            errors,
            colors: logger.logs.colors,
            sound: logger.logs.sound,
            classification: logger.logs.classification,
            coproduction: logger.logs.coproduction,
            completed: new Date()
        };
        logger.save();

        console.log('\n✅ Log guardado en: wp-complete-migration-log.json');

    } catch (error) {
        console.error('❌ Error fatal:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Conexión MySQL cerrada');
        }
    }
}

// Función para verificar el mapeo de colores
async function verifyColorMapping() {
    let connection;

    try {
        connection = await mysql.createConnection(MYSQL_CONFIG);

        console.log('🔍 Verificando mapeo de colores...\n');

        const [colors] = await connection.execute(`
      SELECT DISTINCT
        t.term_id,
        t.name,
        t.slug,
        COUNT(DISTINCT tr.object_id) as movie_count
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE tt.taxonomy = 'color'
      AND p.post_type = 'pelicula'
      GROUP BY t.term_id, t.name, t.slug
      ORDER BY movie_count DESC
    `);

        console.log('Colores en WordPress vs Mapeo:');
        console.log('================================\n');

        let mapped = 0;
        let notMapped = 0;

        colors.forEach(color => {
            const mappedSlug = WP_COLOR_MAPPING[color.term_id.toString()];
            const status = mappedSlug ? '✅' : '❌';

            console.log(`${status} ID: ${color.term_id}`);
            console.log(`   Nombre: ${color.name}`);
            console.log(`   Slug WP: ${color.slug}`);
            console.log(`   Películas: ${color.movie_count}`);

            if (mappedSlug) {
                console.log(`   → Mapea a: ${mappedSlug}`);
                mapped++;
            } else {
                console.log(`   ⚠️  NO MAPEADO`);
                notMapped++;
            }
            console.log('');
        });

        console.log('================================');
        console.log(`Total: ${colors.length} colores`);
        console.log(`✅ Mapeados: ${mapped}`);
        console.log(`❌ Sin mapear: ${notMapped}`);

    } finally {
        if (connection) await connection.end();
    }
}

// Función para verificar clasificaciones
async function verifyClassifications() {
    let connection;

    try {
        connection = await mysql.createConnection(MYSQL_CONFIG);

        console.log('🔍 Verificando clasificaciones en WordPress...\n');

        // Ver todas las clasificaciones únicas
        const uniqueRatings = await getAllUniqueRatings(connection);

        console.log('Clasificaciones encontradas:');
        console.log('================================\n');

        uniqueRatings.forEach(rating => {
            console.log(`Valor original: "${rating.original_value}"`);
            console.log(`  - Nombre: ${rating.name}`);
            console.log(`  - Abreviación: ${rating.abbreviation}`);
            console.log(`  - Fuente: ${rating.source}`);
            console.log(`  - Uso: ${rating.usage_count} películas`);
            console.log('');
        });

        console.log('================================');
        console.log(`Total: ${uniqueRatings.length} clasificaciones únicas`);

    } finally {
        if (connection) await connection.end();
    }
}

// Función para explorar la estructura
async function exploreStructure() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);

    console.log('🔍 Explorando estructura de WordPress...\n');

    // Ver tipos de post
    const [postTypes] = await connection.execute(`
    SELECT post_type, COUNT(*) as count 
    FROM wp_posts 
    WHERE post_status = 'publish' 
    GROUP BY post_type
    ORDER BY count DESC
  `);

    console.log('📋 Tipos de post:');
    console.table(postTypes);

    // Ver taxonomías
    const [taxonomies] = await connection.execute(`
    SELECT DISTINCT taxonomy, COUNT(*) as count
    FROM wp_term_taxonomy
    GROUP BY taxonomy
    ORDER BY count DESC
  `);

    console.log('\n📁 Taxonomías:');
    console.table(taxonomies);

    // Ver meta keys para películas
    const [metaKeys] = await connection.execute(`
    SELECT DISTINCT pm.meta_key, COUNT(*) as count
    FROM wp_postmeta pm
    JOIN wp_posts p ON pm.post_id = p.ID
    WHERE p.post_type = 'pelicula'
    AND pm.meta_key NOT LIKE '\_%'
    GROUP BY pm.meta_key
    ORDER BY count DESC
    LIMIT 30
  `);

    console.log('\n🔑 Meta keys más comunes en películas:');
    console.table(metaKeys);

    await connection.end();
}

// Ejecutar
const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log(`
Migración Completa WordPress → Supabase (con Coproducción)
==========================================================

Uso: node migrate-wp-to-supabase-full.js [opciones]

Opciones:
  --migrate             Ejecutar migración completa (clasificaciones + películas + colores + sonido + países + coproducción)
  --clean               Limpiar tablas movies, ratings, countries y movie_countries antes de migrar
  --verify-colors       Verificar mapeo de colores
  --verify-ratings      Verificar clasificaciones
  --explore             Explorar estructura de WordPress
  --help                Mostrar esta ayuda

Configuración:
  MySQL Host: ${MYSQL_CONFIG.host}
  MySQL Database: ${MYSQL_CONFIG.database}
  Supabase URL: ${SUPABASE_URL}

Nota: La migración incluye:
      1. Clasificaciones (ratings)
      2. Películas con colores y sonido
      3. Países
      4. Coproducción (relaciones película-país)
      
      Argentina se agrega automáticamente como país principal para todas las películas.
`);
} else if (args.includes('--verify-colors')) {
    verifyColorMapping().catch(console.error);
} else if (args.includes('--verify-ratings')) {
    verifyClassifications().catch(console.error);
} else if (args.includes('--explore')) {
    exploreStructure().catch(console.error);
} else if (args.includes('--migrate')) {
    migrateComplete().catch(console.error);
} else {
    console.log('Usa --help para ver las opciones disponibles');
    console.log('Para ejecutar la migración completa: node migrate-wp-to-supabase-full.js --migrate');
}