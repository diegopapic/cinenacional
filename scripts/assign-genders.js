// scripts/assign-genders.js
import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const prisma = new PrismaClient()

// Configurar readline en modo raw para capturar teclas sin Enter
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
}

const waitForKeypress = () => {
  return new Promise((resolve) => {
    const handler = (str, key) => {
      // Ctrl+C
      if (key.ctrl && key.name === 'c') {
        process.exit(0)
      }
      
      process.stdin.removeListener('keypress', handler)
      resolve(key.name)
    }
    
    process.stdin.once('keypress', handler)
  })
}

// Stack para deshacer cambios
const undoStack = []

async function assignGenders() {
  try {
    console.log('\n🎬 Sistema de Asignación de Géneros - Cine Nacional\n')

    // Obtener personas sin género asignado
    const peopleWithoutGender = await prisma.person.findMany({
      where: {
        gender: null
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        realName: true
      }
    })

    const total = peopleWithoutGender.length
    console.log(`📋 Total de personas sin género asignado: ${total}\n`)

    if (total === 0) {
      console.log('✅ ¡Todas las personas tienen género asignado!')
      process.exit(0)
    }

    console.log('Opciones:')
    console.log('  m = Masculino (MALE)')
    console.log('  f = Femenino (FEMALE)')
    console.log('  s = Saltar esta persona')
    console.log('  u = Deshacer último cambio')
    console.log('  q = Salir')
    console.log('─'.repeat(50))

    let processed = 0
    let assigned = 0

    for (let i = 0; i < peopleWithoutGender.length; i++) {
      const person = peopleWithoutGender[i]
      const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ')
      const remaining = total - processed

      console.log('\n' + '─'.repeat(50))
      console.log(`📍 Progreso: ${processed + 1}/${total} (Quedan: ${remaining - 1})`)
      console.log(`👤 ${fullName}`)
      if (person.realName && person.realName !== fullName) {
        console.log(`   💡 Nombre real: ${person.realName}`)
      }

      process.stdout.write('\n¿Género? (m/f/s/u/q): ')
      const option = await waitForKeypress()

      // Mostrar la tecla presionada
      console.log(option)

      // Opción: Salir
      if (option === 'q') {
        console.log('\n👋 Saliendo del sistema...')
        console.log(`📊 Resumen: ${assigned} personas procesadas de ${processed} revisadas`)
        break
      }

      // Opción: Deshacer
      if (option === 'u') {
        if (undoStack.length === 0) {
          console.log('⚠️  No hay cambios para deshacer')
          i-- // No avanzar en el índice
          continue
        }

        const lastChange = undoStack.pop()
        await prisma.person.update({
          where: { id: lastChange.personId },
          data: { gender: null }
        })

        console.log(`↩️  Deshecho: ${lastChange.personName} ya no tiene género asignado`)
        assigned--
        
        // Volver al índice anterior para reprocesar
        i -= 2 // -1 por el pop, -1 porque el for++ lo incrementará
        if (i < -1) i = -1 // Protección de límite
        processed--
        continue
      }

      // Opción: Saltar
      if (option === 's') {
        console.log('⏭️  Saltando...')
        processed++
        continue
      }

      // Opción: Asignar género
      let gender = null
      if (option === 'm') {
        gender = 'MALE'
      } else if (option === 'f') {
        gender = 'FEMALE'
      } else {
        console.log('❌ Opción inválida. Por favor presione m, f, s, u o q')
        i-- // Volver a preguntar por esta persona
        continue
      }

      // Actualizar en base de datos
      await prisma.person.update({
        where: { id: person.id },
        data: { gender }
      })

      // Guardar en stack para deshacer
      undoStack.push({
        personId: person.id,
        personName: fullName,
        gender: gender
      })

      const genderLabel = gender === 'MALE' ? 'Masculino' : 'Femenino'
      console.log(`✅ Género asignado: ${genderLabel}`)
      
      assigned++
      processed++
    }

    console.log('\n' + '═'.repeat(50))
    console.log('✨ Proceso completado!')
    console.log(`📊 Estadísticas finales:`)
    console.log(`   • Total revisadas: ${processed}`)
    console.log(`   • Géneros asignados: ${assigned}`)
    console.log(`   • Saltadas: ${processed - assigned}`)
    console.log(`   • Pendientes: ${total - processed}`)
    console.log('═'.repeat(50))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }
    process.exit(0)
  }
}

// Manejo de señales para cerrar correctamente
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Proceso interrumpido. Cerrando conexiones...')
  await prisma.$disconnect()
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
  process.exit(0)
})

assignGenders()