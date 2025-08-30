// scripts/rebuild-movie-countries-from-wp.js
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración MySQL local
const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '', // Tu contraseña de MySQL
    database: 'wordpress_cine',
    port: 3306
};

// Mapa de IDs de WordPress a países (del script original)
const countryIdMap = {
    "7362": { name: "España", code: "ES" },
    "7363": { name: "Perú", code: "PE" },
    "7364": { name: "Francia", code: "FR" },
    "7365": { name: "Uruguay", code: "UY" },
    "7366": { name: "Alemania", code: "DE" },
    "7367": { name: "Chile", code: "CL" },
    "7368": { name: "Italia", code: "IT" },
    "7369": { name: "Corea del Sur", code: "KR" },
    "7370": { name: "Bolivia", code: "BO" },
    "7371": { name: "Paraguay", code: "PY" },
    "7372": { name: "Brasil", code: "BR" },
    "7373": { name: "Venezuela", code: "VE" },
    "7374": { name: "Suiza", code: "CH" },
    "7375": { name: "Panamá", code: "PA" },
    "7376": { name: "Suecia", code: "SE" },
    "7377": { name: "Canadá", code: "CA" },
    "7378": { name: "Países Bajos", code: "NL" },
    "7379": { name: "Estados Unidos", code: "US" },
    "7380": { name: "Taiwán", code: "TW" },
    "7381": { name: "México", code: "MX" },
    "7382": { name: "Inglaterra", code: "GB" },
    "7383": { name: "Polonia", code: "PL" },
    "7384": { name: "República Checa", code: "CZ" },
    "7385": { name: "Bélgica", code: "BE" },
    "7386": { name: "Australia", code: "AU" },
    "7387": { name: "Austria", code: "AT" },
    "7388": { name: "República Dominicana", code: "DO" },
    "7389": { name: "Catar", code: "QA" },
    "7390": { name: "Cuba", code: "CU" },
    "7391": { name: "Rumania", code: "RO" },
    "7396": { name: "China", code: "CN" },
    "7397": { name: "Ecuador", code: "EC" },
    "7399": { name: "Dinamarca", code: "DK" },
    "7400": { name: "Noruega", code: "NO" },
    "7402": { name: "Portugal", code: "PT" },
    "7403": { name: "Túnez", code: "TN" },
    "7407": { name: "Puerto Rico", code: "PR" },
    "7408": { name: "Grecia", code: "GR" },
    "7410": { name: "Guatemala", code: "GT" },
    "7412": { name: "India", code: "IN" },
    "7413": { name: "Yugoslavia", code: "YU" },
    "7417": { name: "Turquía", code: "TR" },
    "7418": { name: "Mali", code: "ML" },
    "7419": { name: "Japón", code: "JP" },
    "7420": { name: "Finlandia", code: "FI" },
    "7421": { name: "Irán", code: "IR" },
    "7422": { name: "Israel", code: "IL" },
    "7424": { name: "Nueva Zelanda", code: "NZ" },
    "7425": { name: "Costa Rica", code: "CR" },
    "7426": { name: "Guinea", code: "GN" },
    "7428": { name: "Angola", code: "AO" },
    "7429": { name: "Etiopía", code: "ET" },
    "7430": { name: "Eslovenia", code: "SI" },
    "7431": { name: "Palestina", code: "PS" },
    "7432": { name: "Nueva Caledonia", code: "NC" },
    "7436": { name: "Marruecos", code: "MA" },
    "7437": { name: "Islandia", code: "IS" },
    "7438": { name: "Namibia", code: "NA" },
    "7439": { name: "Burkina Faso", code: "BF" },
    "7440": { name: "Sudáfrica", code: "ZA" },
    "7887": { name: "Colombia", code: "CO" },
    "8166": { name: "Serbia", code: "RS" },
    "9082": { name: "Honduras", code: "HN" },
    "9087": { name: "Singapur", code: "SG" },
    "9120": { name: "Bulgaria", code: "BG" }
};

async function rebuildMovieCountries() {
    let mysqlConnection;

    try {
        console.log('🚀 Iniciando reconstrucción de movie_countries desde WordPress...\n');

        // Conectar a MySQL
        mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ Conectado a MySQL\n');

        // 1. Crear un mapa de países name -> location_id
        console.log('📍 Obteniendo países de locations...');
        const locations = await prisma.location.findMany({
            where: { parentId: null }
        });

        const countryToLocationId = new Map();
        for (const [wpId, country] of Object.entries(countryIdMap)) {
            const location = locations.find(l =>
                l.name.toLowerCase() === country.name.toLowerCase()
            );
            if (location) {
                countryToLocationId.set(country.name, location.id);
                console.log(`✅ ${country.name} -> location.id=${location.id}`);
            } else {
                console.log(`⚠️ No encontrado: ${country.name}`);
            }
        }

        // 2. Obtener películas con coproducción de WordPress
        console.log('\n📊 Obteniendo películas con coproducción de WordPress...');
        const [wpMovies] = await mysqlConnection.execute(`
            SELECT 
                p.ID as wp_id,
                p.post_title,
                pm.meta_value as coproduction_data
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'coproduccion'
            WHERE p.post_type = 'pelicula'
            AND p.post_status IN ('publish', 'draft')
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
        `);

        console.log(`Found ${wpMovies.length} películas con datos de coproducción\n`);

        // 3. Obtener mapeo de wp_id -> postgres_id
        const movies = await prisma.movie.findMany({
            select: { id: true, title: true }
        });

        const titleToMovieId = new Map();
        movies.forEach(m => {
            // Limpiar título quitando el año si está entre paréntesis
            const cleanTitle = m.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
            titleToMovieId.set(cleanTitle.toLowerCase(), m.id);
        });

        // 4. Limpiar tabla movie_countries
        console.log('🧹 Limpiando tabla movie_countries...');
        await prisma.movieCountry.deleteMany();


        // 5. Procesar cada película
        let processed = 0;
        let errors = 0;
        let inserted = 0;

        for (const wpMovie of wpMovies) {
            try {
                // Limpiar título
                const cleanTitle = wpMovie.post_title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                const movieId = titleToMovieId.get(cleanTitle.toLowerCase());

                if (!movieId) {
                    console.log(`⚠️ No encontrada en PostgreSQL: "${cleanTitle}"`);
                    continue;
                }

                // Extraer países del campo serializado
                const countryWpIds = [];
                const matches = wpMovie.coproduction_data.match(/s:\d+:"(\d+)"/g);
                if (matches) {
                    matches.forEach(match => {
                        const wpCountryId = match.match(/s:\d+:"(\d+)"/)[1];
                        countryWpIds.push(wpCountryId);
                    });
                }

                const addedCountries = [];

                // Agregar SOLO países coproductores (NO Argentina)
                for (const wpId of countryWpIds) {
                    const country = countryIdMap[wpId];
                    if (country) {
                        const locationId = countryToLocationId.get(country.name);
                        if (locationId) {
                            try {
                                // Usar upsert para evitar duplicados
                                await prisma.movieCountry.upsert({
                                    where: {
                                        movieId_countryId: {
                                            movieId: movieId,
                                            countryId: locationId
                                        }
                                    },
                                    update: {
                                        isPrimary: false
                                    },
                                    create: {
                                        movieId: movieId,
                                        countryId: locationId,
                                        isPrimary: false
                                    }
                                });
                                addedCountries.push(country.name);
                                inserted++;
                            } catch (err) {
                                // Ignorar errores de duplicados silenciosamente
                            }
                        }
                    }
                }

                if (addedCountries.length > 0) {
                    console.log(`✅ ${cleanTitle}: ${addedCountries.join(', ')}`);
                }
                processed++;

            } catch (error) {
                console.error(`❌ Error procesando ${wpMovie.post_title}:`, error.message);
                errors++;
            }
        }

        // Verificar resultados
        const count = await prisma.movieCountry.count();
        const stats = await prisma.$queryRaw`
            SELECT l.name, COUNT(*) as count
            FROM movie_countries mc
            JOIN locations l ON mc.country_id = l.id
            GROUP BY l.id, l.name
            ORDER BY count DESC
            LIMIT 10
        `;

        console.log(`\n📊 RESUMEN:`);
        console.log(`  - Películas procesadas: ${processed}`);
        console.log(`  - Registros insertados: ${inserted}`);
        console.log(`  - Errores: ${errors}`);
        console.log(`  - Total registros en movie_countries: ${count}`);
        console.log(`\n📊 Top 10 países:`);
        stats.forEach(s => {
            console.log(`  ${s.name}: ${s.count} películas`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (mysqlConnection) await mysqlConnection.end();
        await prisma.$disconnect();
    }
}

rebuildMovieCountries();