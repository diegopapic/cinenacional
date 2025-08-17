/**
 * Script para migrar personas desde WordPress a Supabase
 * Las personas están almacenadas como post_type = 'persona'
 * 
 * Ubicación: /scripts/migrate-wp-people-to-supabase.js
 */

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

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logger para tracking
class PeopleMigrationLogger {
    constructor() {
        this.logs = {
            start: new Date(),
            people: [],
            errors: [],
            stats: {
                total: 0,
                migrated: 0,
                updated: 0,
                errors: 0,
                withBio: 0,
                withoutBio: 0
            }
        };
    }

    logPerson(wpId, name, status, error = null) {
        this.logs.people.push({
            wpId,
            name,
            status,
            error: error?.message,
            timestamp: new Date()
        });
    }

    save() {
        fs.writeFileSync('migration-people-log.json', JSON.stringify(this.logs, null, 2));
    }
}

const logger = new PeopleMigrationLogger();

/**
 * Separa un nombre completo en firstName y lastName
 * Maneja casos comunes en español/argentino
 */
function splitName(fullName) {
    if (!fullName) return { firstName: null, lastName: null };
    
    // Limpiar espacios extras
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    
    // Casos especiales de nombres compuestos conocidos
    const compoundFirstNames = [
        'María José', 'María Elena', 'María del Carmen', 'María de los Angeles',
        'Juan Carlos', 'Juan Pablo', 'Juan Manuel', 'José María', 'José Luis',
        'Luis Alberto', 'Carlos Alberto', 'Ana María', 'María Fernanda',
        'María Victoria', 'María Laura', 'María Alejandra'
    ];
    
    // Buscar si empieza con un nombre compuesto conocido
    for (const compound of compoundFirstNames) {
        if (cleanName.toLowerCase().startsWith(compound.toLowerCase())) {
            return {
                firstName: cleanName.substring(0, compound.length),
                lastName: cleanName.substring(compound.length).trim() || null
            };
        }
    }
    
    // Dividir por espacios
    const parts = cleanName.split(' ');
    
    if (parts.length === 1) {
        // Solo un nombre
        return { firstName: parts[0], lastName: null };
    } else if (parts.length === 2) {
        // Nombre y apellido simple
        return { firstName: parts[0], lastName: parts[1] };
    } else if (parts.length === 3) {
        // Posibles casos: 
        // - Nombre Apellido1 Apellido2
        // - Nombre1 Nombre2 Apellido
        // Si la segunda palabra es una preposición, es parte del apellido
        const prepositions = ['de', 'del', 'la', 'las', 'los', 'van', 'von', 'di'];
        if (prepositions.includes(parts[1].toLowerCase())) {
            return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
        }
        // Por defecto: primer palabra es nombre, resto es apellido
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    } else {
        // 4 o más partes
        // Buscar preposiciones para determinar dónde empieza el apellido
        const prepositions = ['de', 'del', 'de la', 'de las', 'de los', 'van', 'von', 'di'];
        
        // Buscar si hay una preposición
        for (let i = 1; i < parts.length - 1; i++) {
            if (prepositions.includes(parts[i].toLowerCase())) {
                // Todo antes de la preposición es nombre, desde la preposición es apellido
                return {
                    firstName: parts.slice(0, i).join(' '),
                    lastName: parts.slice(i).join(' ')
                };
            }
        }
        
        // Si no hay preposiciones, asumimos que las primeras 2 palabras son nombre
        // (común en nombres argentinos/españoles)
        if (parts.length === 4) {
            return {
                firstName: parts.slice(0, 2).join(' '),
                lastName: parts.slice(2).join(' ')
            };
        }
        
        // Por defecto: primera palabra es nombre, resto es apellido
        return {
            firstName: parts[0],
            lastName: parts.slice(1).join(' ')
        };
    }
}

/**
 * Genera un slug a partir del nombre
 */
function generateSlug(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .normalize("NFD") // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
        .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos
        .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
        .substring(0, 255); // Limitar longitud
}

async function migratePeople() {
    let connection;
    
    try {
        console.log('🎬 MIGRACIÓN DE PERSONAS WordPress → Supabase');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Conectar a MySQL
        console.log('📌 Conectando a MySQL local...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('✅ Conectado a MySQL\n');
        
        // Verificar conexión Supabase
        console.log('📌 Verificando Supabase...');
        const { count } = await supabase
            .from('people')
            .select('*', { count: 'exact', head: true });
        console.log(`✅ Conectado a Supabase (${count || 0} personas actuales)\n`);
        
        // Limpiar tabla si se especifica
        if (process.argv.includes('--clean')) {
            console.log('🧹 Limpiando tabla people...');
            const { error: deleteError } = await supabase
                .from('people')
                .delete()
                .neq('id', 0); // Evitar borrar todo por seguridad
            
            if (deleteError && deleteError.code !== 'PGRST116') {
                console.error('❌ Error al limpiar tabla:', deleteError);
                throw deleteError;
            }
            console.log('✅ Tabla people limpiada\n');
        }
        
        // Obtener personas de MySQL
        console.log('📊 Obteniendo personas de WordPress...');
        const [people] = await connection.execute(`
            SELECT 
                ID,
                post_title as full_name,
                post_name as slug,
                post_content as biography,
                post_date,
                post_modified,
                post_status,
                guid
            FROM wp_posts 
            WHERE post_type = 'persona' 
            AND post_status = 'publish'
            ORDER BY post_title
        `);
        
        console.log(`✅ ${people.length} personas encontradas\n`);
        logger.logs.stats.total = people.length;
        
        // Mostrar algunas muestras de cómo se separarán los nombres
        console.log('📝 Muestras de separación de nombres:');
        console.log('─────────────────────────────────────────');
        const samples = people.slice(0, 5);
        samples.forEach(person => {
            const { firstName, lastName } = splitName(person.full_name);
            console.log(`   "${person.full_name}"`);
            console.log(`   → Nombre: ${firstName || '(vacío)'}`);
            console.log(`   → Apellido: ${lastName || '(vacío)'}`);
            console.log('');
        });
        
        // Preguntar si continuar (si no está en modo --auto)
        if (!process.argv.includes('--auto')) {
            console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Migrar cada persona
        console.log('\n🚀 Iniciando migración...\n');
        let migrated = 0;
        let updated = 0;
        let errors = 0;
        
        for (const person of people) {
            try {
                // Separar nombre y apellido
                const { firstName, lastName } = splitName(person.full_name);
                
                // Usar el slug de WordPress o generar uno nuevo
                const slug = person.slug || generateSlug(person.full_name);
                
                // Contar estadísticas
                if (person.biography && person.biography.trim()) {
                    logger.logs.stats.withBio++;
                } else {
                    logger.logs.stats.withoutBio++;
                }
                
                // Verificar si el ID ya existe
                const { data: existingById } = await supabase
                    .from('people')
                    .select('id, slug')
                    .eq('id', parseInt(person.ID))
                    .single();
                
                // Datos para Supabase (siguiendo el schema de Prisma)
                const personData = {
                    id: parseInt(person.ID),
                    slug: slug,
                    first_name: firstName,
                    last_name: lastName,
                    real_name: null, // No tenemos este dato en WordPress
                    birth_date: null, // No tenemos este dato
                    death_date: null, // No tenemos este dato
                    birth_location_id: null,
                    death_location_id: null,
                    biography: person.biography && person.biography.trim() ? person.biography.trim() : null,
                    photo_url: null, // Se puede migrar después desde featured image
                    gender: null, // No tenemos este dato
                    hide_age: false,
                    has_links: false,
                    is_active: person.post_status === 'publish',
                    created_at: person.post_date,
                    updated_at: person.post_modified
                };
                
                console.log(`👤 Procesando: "${person.full_name}"`);
                console.log(`   - WP ID: ${person.ID}`);
                console.log(`   - Slug: ${slug}`);
                console.log(`   - Nombre: ${firstName || '(vacío)'} | Apellido: ${lastName || '(vacío)'}`);
                if (person.biography && person.biography.trim()) {
                    console.log(`   - Con biografía (${person.biography.length} caracteres)`);
                }
                
                if (existingById) {
                    // Actualizar registro existente
                    console.log(`   ⚠️ ID ${person.ID} ya existe, actualizando...`);
                    
                    const { data, error } = await supabase
                        .from('people')
                        .update(personData)
                        .eq('id', parseInt(person.ID))
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    console.log(`   ✅ Actualizada\n`);
                    logger.logPerson(person.ID, person.full_name, 'updated');
                    updated++;
                } else {
                    // Insertar nuevo registro
                    const { data, error } = await supabase
                        .from('people')
                        .insert([personData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    console.log(`   ✅ Migrada con ID: ${data.id}\n`);
                    logger.logPerson(person.ID, person.full_name, 'success');
                    migrated++;
                }
                
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}\n`);
                logger.logPerson(person.ID, person.full_name, 'error', error);
                errors++;
            }
        }
        
        // Actualizar la secuencia de PostgreSQL
        console.log('\n🔧 Actualizando secuencia de IDs...');
        const { data: maxIdResult } = await supabase
            .from('people')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        
        if (maxIdResult) {
            console.log(`   ID máximo encontrado: ${maxIdResult.id}`);
            console.log(`   ⚠️ IMPORTANTE: Ejecuta este SQL en Supabase:`);
            console.log(`   SELECT setval('people_id_seq', ${maxIdResult.id + 1});`);
        }
        
        // Resumen
        console.log('\n\n📊 RESUMEN DE MIGRACIÓN DE PERSONAS');
        console.log('════════════════════════════════════════════');
        console.log(`Total de personas procesadas: ${people.length}`);
        console.log(`✅ Nuevas migradas: ${migrated}`);
        console.log(`🔄 Actualizadas: ${updated}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('\n📝 Estadísticas adicionales:');
        console.log(`   - Con biografía: ${logger.logs.stats.withBio}`);
        console.log(`   - Sin biografía: ${logger.logs.stats.withoutBio}`);
        
        // Guardar log
        logger.logs.stats.migrated = migrated;
        logger.logs.stats.updated = updated;
        logger.logs.stats.errors = errors;
        logger.save();
        
        console.log('\n✅ Log guardado en: migration-people-log.json');
        
    } catch (error) {
        console.error('❌ Error fatal:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Conexión MySQL cerrada');
        }
    }
}

// Función para verificar personas antes de migrar
async function checkPeople() {
    let connection;
    
    try {
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('👥 Verificando personas en WordPress...\n');
        
        // Estadísticas básicas
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN post_status = 'publish' THEN 1 END) as published,
                COUNT(CASE WHEN post_status = 'draft' THEN 1 END) as draft,
                COUNT(CASE WHEN post_content IS NOT NULL AND post_content != '' THEN 1 END) as with_bio
            FROM wp_posts
            WHERE post_type = 'persona'
        `);
        
        console.log('📊 Estadísticas:');
        console.log(`   - Total personas: ${stats[0].total}`);
        console.log(`   - Publicadas: ${stats[0].published}`);
        console.log(`   - Borradores: ${stats[0].draft}`);
        console.log(`   - Con biografía: ${stats[0].with_bio}`);
        
        // Ver algunas muestras
        const [samples] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name as slug,
                LENGTH(post_content) as bio_length,
                post_status
            FROM wp_posts
            WHERE post_type = 'persona'
            AND post_status = 'publish'
            ORDER BY post_title
            LIMIT 20
        `);
        
        console.log('\n📝 Primeras 20 personas:');
        console.log('─────────────────────────────────────────');
        samples.forEach((person, index) => {
            const { firstName, lastName } = splitName(person.post_title);
            console.log(`${(index + 1).toString().padStart(2)}. ${person.post_title}`);
            console.log(`    → Nombre: ${firstName || '(vacío)'} | Apellido: ${lastName || '(vacío)'}`);
            console.log(`    → Slug: ${person.slug}`);
            if (person.bio_length > 0) {
                console.log(`    → Biografía: ${person.bio_length} caracteres`);
            }
            console.log('');
        });
        
        // Verificar nombres problemáticos
        const [problematic] = await connection.execute(`
            SELECT post_title
            FROM wp_posts
            WHERE post_type = 'persona'
            AND post_status = 'publish'
            AND (
                post_title LIKE '%(%' OR 
                post_title LIKE '%[%' OR
                post_title LIKE '%,%' OR
                LENGTH(post_title) < 3
            )
            LIMIT 10
        `);
        
        if (problematic.length > 0) {
            console.log('⚠️ Nombres que podrían necesitar revisión:');
            problematic.forEach(p => {
                console.log(`   - "${p.post_title}"`);
            });
        }
        
    } finally {
        if (connection) await connection.end();
    }
}

// Ejecutar
const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log(`
Migración de Personas WordPress → Supabase
===========================================

Uso: node migrate-wp-people-to-supabase.js [opciones]

Opciones:
  --migrate     Ejecutar migración
  --clean       Limpiar tabla people antes de migrar
  --check       Verificar personas antes de migrar
  --auto        No pausar para confirmación
  --help        Mostrar esta ayuda

Campos migrados:
  - id (preservado de WordPress)
  - first_name (extraído del post_title)
  - last_name (extraído del post_title)
  - slug (preservado de WordPress)
  - biography (post_content)
  - is_active (basado en post_status)
  - created_at (post_date)
  - updated_at (post_modified)

Configuración:
  MySQL Host: ${MYSQL_CONFIG.host}
  MySQL Database: ${MYSQL_CONFIG.database}
  Supabase URL: ${SUPABASE_URL}

Ejemplos:
  node migrate-wp-people-to-supabase.js --check
  node migrate-wp-people-to-supabase.js --migrate --clean --auto
`);
} else if (args.includes('--migrate')) {
    migratePeople().catch(console.error);
} else if (args.includes('--check')) {
    checkPeople().catch(console.error);
} else {
    console.log('Usa --help para ver las opciones disponibles');
    console.log('Para verificar: node migrate-wp-people-to-supabase.js --check');
    console.log('Para migrar: node migrate-wp-people-to-supabase.js --migrate --clean');
}