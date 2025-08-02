// scripts/update-movies-coproduction-fields.js
// Script para actualizar las películas existentes con los campos de coproducción

import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';

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

// Mapa de IDs de WordPress a países (del script original)
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

async function updateCoproductionFields() {
    let connection;
    
    try {
        console.log('🚀 Actualizando campos de coproducción en películas existentes\n');
        
        // Conectar a MySQL
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ Conectado a MySQL\n');
        
        // 1. Verificar/crear Argentina en countries
        console.log('🇦🇷 Verificando Argentina en tabla countries...');
        const { data: argentinaCheck } = await supabase
            .from('countries')
            .select('*')
            .or('code.eq.AR,name.eq.Argentina')
            .single();

        let argentinaId;
        if (!argentinaCheck) {
            const { data: newCountry, error } = await supabase
                .from('countries')
                .insert({ code: 'AR', name: 'Argentina' })
                .select()
                .single();
            
            if (error) throw error;
            argentinaId = newCountry.id;
            console.log('✅ Argentina creada con ID:', argentinaId);
        } else {
            argentinaId = argentinaCheck.id;
            console.log('✅ Argentina ya existe con ID:', argentinaId);
        }
        
        // 2. Obtener películas con información de coproducción de WordPress
        console.log('\n📊 Obteniendo información de coproducción de WordPress...');
        const [wpMovies] = await connection.execute(`
            SELECT 
                p.ID as wp_id,
                p.post_title as title,
                pm_coproduction.meta_value as coproduction_data
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm_coproduction 
                ON p.ID = pm_coproduction.post_id AND pm_coproduction.meta_key = 'coproduccion'
            WHERE p.post_type = 'pelicula' 
            AND p.post_status = 'publish'
            ORDER BY p.ID
        `);
        
        console.log(`✅ ${wpMovies.length} películas encontradas en WordPress\n`);
        
        // 3. Contar cuántas tienen coproducción
        const moviesWithCoprod = wpMovies.filter(m => m.coproduction_data && m.coproduction_data !== '');
        console.log(`📊 ${moviesWithCoprod.length} películas tienen datos de coproducción\n`);
        
        // 4. Obtener el mapeo de películas en Supabase
        console.log('🔄 Obteniendo películas de Supabase...');
        const { data: supabaseMovies, error: fetchError } = await supabase
            .from('movies')
            .select('id, title, slug');
            
        if (fetchError) throw fetchError;
        
        // Crear mapa por título (ya que no tenemos wp_id)
        const titleToIdMap = {};
        supabaseMovies.forEach(movie => {
            // Normalizar título para mejor match
            const normalizedTitle = movie.title.toLowerCase().trim();
            titleToIdMap[normalizedTitle] = movie.id;
        });
        
        console.log(`✅ ${supabaseMovies.length} películas en Supabase\n`);
        
        // 5. Actualizar películas en lotes
        const BATCH_SIZE = 100;
        let updatedCount = 0;
        let coproductionCount = 0;
        let notFoundCount = 0;
        
        console.log('⏳ Actualizando películas...\n');
        
        for (let i = 0; i < wpMovies.length; i += BATCH_SIZE) {
            const batch = wpMovies.slice(i, i + BATCH_SIZE);
            const updates = [];
            
            for (const wpMovie of batch) {
                // Buscar película en Supabase por título
                const normalizedTitle = wpMovie.title
                    .replace(/\s*\(\d{4}\)\s*$/, '') // Quitar año del título
                    .toLowerCase()
                    .trim();
                    
                const supabaseId = titleToIdMap[normalizedTitle];
                
                if (!supabaseId) {
                    notFoundCount++;
                    continue;
                }
                
                // Determinar si es coproducción
                let isCoproduction = false;
                let productionType = 'national';
                const countryList = ['Argentina']; // Siempre incluir Argentina
                
                if (wpMovie.coproduction_data) {
                    // Extraer IDs de países del valor serializado
                    const matches = wpMovie.coproduction_data.match(/s:\d+:"(\d+)"/g);
                    
                    if (matches && matches.length > 0) {
                        isCoproduction = true;
                        productionType = 'coproduction';
                        coproductionCount++;
                        
                        // Agregar países coproductores al array
                        matches.forEach(match => {
                            const wpCountryId = match.match(/s:\d+:"(\d+)"/)[1];
                            if (countryIdMap[wpCountryId] && countryIdMap[wpCountryId].name !== 'Argentina') {
                                countryList.push(countryIdMap[wpCountryId].name);
                            }
                        });
                    }
                }
                
                // Preparar actualización
                updates.push({
                    id: supabaseId,
                    countries: countryList,
                    is_coproduction: isCoproduction,
                    production_type: productionType
                });
            }
            
            // Ejecutar actualizaciones
            if (updates.length > 0) {
                const { error: updateError } = await supabase
                    .from('movies')
                    .upsert(updates, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });
                
                if (updateError) {
                    console.error('❌ Error en lote:', updateError.message);
                } else {
                    updatedCount += updates.length;
                }
            }
            
            const progress = ((i + batch.length) / wpMovies.length * 100).toFixed(1);
            console.log(`✅ Progreso: ${progress}% - Actualizadas: ${updatedCount}`);
        }
        
        // 6. Ahora actualizar la tabla movie_countries
        console.log('\n\n🌍 Actualizando relaciones en movie_countries...');
        
        // Primero, agregar Argentina a todas las películas
        console.log('Agregando Argentina como país principal a todas las películas...');
        
        for (const movie of supabaseMovies) {
            await supabase
                .from('movie_countries')
                .upsert({
                    movie_id: movie.id,
                    country_id: argentinaId,
                    is_primary: true
                }, {
                    onConflict: 'movie_id,country_id',
                    ignoreDuplicates: true
                });
        }
        
        // Mostrar resumen
        console.log('\n\n📊 RESUMEN DE ACTUALIZACIÓN');
        console.log('═══════════════════════════');
        console.log(`Total películas en WordPress: ${wpMovies.length}`);
        console.log(`Total películas en Supabase: ${supabaseMovies.length}`);
        console.log(`✅ Películas actualizadas: ${updatedCount}`);
        console.log(`🌍 Coproducciones identificadas: ${coproductionCount}`);
        console.log(`⚠️  Películas no encontradas por título: ${notFoundCount}`);
        console.log('\n✅ Todas las películas ahora tienen:');
        console.log('   - Campo countries con al menos ["Argentina"]');
        console.log('   - Campo is_coproduction (true/false)');
        console.log('   - Campo production_type ("national" o "coproduction")');
        console.log('   - Relación en movie_countries con Argentina');
        
        // Verificar algunos ejemplos
        console.log('\n🔍 Verificando algunos ejemplos...');
        const { data: examples } = await supabase
            .from('movies')
            .select('title, countries, is_coproduction, production_type')
            .eq('is_coproduction', true)
            .limit(5);
            
        if (examples && examples.length > 0) {
            console.log('\nEjemplos de coproducciones actualizadas:');
            examples.forEach(movie => {
                console.log(`- ${movie.title}`);
                console.log(`  Países: ${movie.countries.join(', ')}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Conexión MySQL cerrada');
        }
    }
}

// Ejecutar
updateCoproductionFields();