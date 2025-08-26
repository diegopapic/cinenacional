// scripts/create-admin.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import path from 'path'

config()

const prisma = new PrismaClient()

// Cargar .env.local específicamente
config({ path: path.resolve(process.cwd(), '.env.local') })

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@cinenacional.com'
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow2024!'
  const username = process.env.ADMIN_USERNAME || 'admin'
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        isAdmin: true,  // Por compatibilidad
        isActive: true
      },
      create: {
        email,
        username,
        password: hashedPassword,
        displayName: 'Administrador',
        role: 'ADMIN',
        isAdmin: true,  // Por compatibilidad
        isActive: true
      }
    })
    
    console.log('✅ Usuario admin creado/actualizado:')
    console.log('📧 Email:', user.email)
    console.log('👤 Username:', user.username || 'N/A')
    console.log('🔑 Password temporal:', password)
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login')
    
    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_CREATED',
        entity: 'user',
        entityId: user.id,
        metadata: {
          createdBy: 'script',
          timestamp: new Date().toISOString()
        }
      }
    })
    
  } catch (error) {
    console.error('Error creando admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()