// scripts/migrate-wp-roles-only.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

// Configuración de conexiones
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Configuración Supabase - COPIADA EXACTAMENTE del script general
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logger
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg)
};

// Función para generar slug
function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9-]/g, '-')     // Reemplazar caracteres especiales
    .replace(/-+/g, '-')              // Eliminar guiones múltiples
    .replace(/^-|-$/g, '');           // Eliminar guiones al inicio/final
}

async function getRolesFromWordPress(connection) {
  log.info('Leyendo roles únicos desde WordPress...');
  
  // Obtener todos los roles del elenco
  const [castRoles] = await connection.execute(`
    SELECT DISTINCT meta_value as role
    FROM wp_postmeta
    WHERE meta_key LIKE 'elenco_%_rol'
    AND meta_value IS NOT NULL
    AND meta_value != ''
  `);
  
  // Obtener todos los roles del crew
  const [crewRoles] = await connection.execute(`
    SELECT DISTINCT meta_value as role
    FROM wp_postmeta
    WHERE meta_key LIKE 'crew_%_rol'
    AND meta_value IS NOT NULL
    AND meta_value != ''
  `);
  
  // Combinar y obtener roles únicos
  const allRoles = new Set();
  
  castRoles.forEach(row => {
    if (row.role && row.role.trim()) {
      allRoles.add(row.role.trim());
    }
  });
  
  crewRoles.forEach(row => {
    if (row.role && row.role.trim()) {
      allRoles.add(row.role.trim());
    }
  });
  
  log.success(`Encontrados ${allRoles.size} roles únicos en WordPress`);
  
  return Array.from(allRoles).sort();
}

// Función para determinar el departamento basándose en el rol REAL
function getDepartmentForRole(role) {
  const roleLower = role.toLowerCase();
  
  // Analizar el rol basándose en palabras clave
  if (roleLower.includes('director') && !roleLower.includes('fotografía') && !roleLower.includes('arte') && !roleLower.includes('producción')) {
    return 'Dirección';
  }
  
  if (roleLower.includes('productor') || roleLower.includes('producción')) {
    return 'Producción';
  }
  
  if (roleLower.includes('guion') || roleLower.includes('guión')) {
    return 'Guión';
  }
  
  if (roleLower.includes('fotografía') || roleLower.includes('fotografia') || roleLower.includes('cámara')) {
    return 'Fotografía';
  }
  
  if (roleLower.includes('montaje') || roleLower.includes('editor') || roleLower.includes('edición')) {
    return 'Edición';
  }
  
  if (roleLower.includes('sonido')) {
    return 'Sonido';
  }
  
  if (roleLower.includes('música') || roleLower.includes('musica') || roleLower.includes('compositor')) {
    return 'Música';
  }
  
  if (roleLower.includes('arte') || roleLower.includes('escenografía')) {
    return 'Arte';
  }
  
  if (roleLower.includes('vestuario')) {
    return 'Vestuario';
  }
  
  if (roleLower.includes('maquillaje')) {
    return 'Maquillaje';
  }
  
  // Si es un rol de actuación
  if (roleLower === 'actor' || roleLower === 'actriz' || roleLower.includes('protagonista')) {
    return 'Actuación';
  }
  
  return 'Otros';
}

// Función para determinar si un rol es principal en su departamento
function isPrimaryRole(role, department) {
  const roleLower = role.toLowerCase();
  
  // El rol principal es el más simple/corto del departamento
  switch(department) {
    case 'Dirección':
      return roleLower === 'director';
    case 'Producción':
      return roleLower === 'productor';
    case 'Guión':
      return roleLower === 'guionista' || roleLower === 'guión';
    case 'Fotografía':
      return roleLower === 'fotografía' || roleLower === 'director de fotografía';
    case 'Edición':
      return roleLower === 'montaje' || roleLower === 'editor';
    case 'Sonido':
      return roleLower === 'sonido' || roleLower === 'sonidista';
    case 'Música':
      return roleLower === 'música' || roleLower === 'compositor';
    case 'Arte':
      return roleLower === 'arte' || roleLower === 'director de arte';
    case 'Actuación':
      return roleLower === 'actor' || roleLower === 'actriz';
    default:
      return false;
  }
}

async function migrateRoles() {
  const connection = await mysql.createConnection(wpConfig);
  
  try {
    // 1. Obtener todos los roles desde WordPress
    const roles = await getRolesFromWordPress(connection);
    
    // 2. Procesar cada rol
    const rolesToInsert = [];
    const departmentPrimarySet = new Set(); // Para trackear si ya hay un principal por departamento
    
    for (const role of roles) {
      const department = getDepartmentForRole(role);
      const slug = generateSlug(role);
      
      // Determinar displayOrder (0 para principales, incrementar para otros)
      let displayOrder = 100; // Por defecto, no principal
      if (isPrimaryRole(role, department) && !departmentPrimarySet.has(department)) {
        displayOrder = 0;
        departmentPrimarySet.add(department);
      }
      
      rolesToInsert.push({
        name: role,
        slug: slug,
        department: department,
        displayOrder: displayOrder,
        isActive: true,
        description: null
      });
    }
    
    // 3. Mostrar resumen antes de migrar
    log.info('\n=== RESUMEN DE ROLES A MIGRAR ===');
    const departmentCount = {};
    rolesToInsert.forEach(r => {
      departmentCount[r.department] = (departmentCount[r.department] || 0) + 1;
    });
    
    Object.entries(departmentCount).forEach(([dept, count]) => {
      log.info(`${dept}: ${count} roles`);
    });
    
    // Mostrar roles principales
    log.info('\n=== ROLES PRINCIPALES POR DEPARTAMENTO ===');
    rolesToInsert
      .filter(r => r.displayOrder === 0)
      .forEach(r => {
        log.success(`${r.department}: "${r.name}"`);
      });
    
    // 4. Insertar en Supabase
    log.info('\n=== INSERTANDO EN SUPABASE ===');
    
    for (const role of rolesToInsert) {
      const { data, error } = await supabase
        .from('roles')
        .insert(role)
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('duplicate')) {
          log.warning(`Rol ya existe: "${role.name}"`);
        } else {
          log.error(`Error insertando rol "${role.name}": ${error.message}`);
        }
      } else {
        log.success(`✓ Rol insertado: "${role.name}" (${role.department})`);
      }
    }
    
    log.success('\n✅ Migración de roles completada');
    
  } catch (error) {
    log.error('Error en la migración:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar migración
migrateRoles();