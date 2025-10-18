import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener casos para revisar
export async function GET() {
  try {
    // Función para contar palabras
    const countWords = (str: string | null) => {
      if (!str) return 0;
      return str.trim().split(/\s+/).length;
    };

    // Obtener todas las personas
    const allPeople = await prisma.person.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        _count: {
          select: {
            castRoles: true,
            crewRoles: true,
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Filtrar casos con más de 3 palabras
    const casesToReview = allPeople.filter(person => {
      const firstNameWords = countWords(person.firstName);
      const lastNameWords = countWords(person.lastName);
      
      return firstNameWords > 3 || lastNameWords > 3;
    });

    // Formatear para la respuesta
    const formattedCases = casesToReview.map(person => ({
      id: person.id,
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      slug: person.slug,
      totalRoles: person._count.castRoles + person._count.crewRoles,
      firstNameWords: countWords(person.firstName),
      lastNameWords: countWords(person.lastName)
    }));

    return NextResponse.json({
      cases: formattedCases,
      total: formattedCases.length
    });

  } catch (error) {
    console.error('Error fetching cases to review:', error);
    return NextResponse.json(
      { error: 'Error al obtener casos para revisar' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar nombre de persona
export async function PUT(request: Request) {
  try {
    const { id, firstName, lastName } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    // Generar nuevo slug basado en los nombres actualizados
    const generateSlug = (first: string, last: string) => {
      const parts = [];
      if (first) parts.push(first);
      if (last) parts.push(last);
      
      return parts
        .join('-')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    const newSlug = generateSlug(firstName, lastName);

    // Verificar si el slug ya existe (excluyendo el ID actual)
    const existingPerson = await prisma.person.findFirst({
      where: {
        slug: newSlug,
        NOT: {
          id: id
        }
      }
    });

    // Si existe, agregar sufijo numérico
    let finalSlug = newSlug;
    if (existingPerson) {
      const count = await prisma.person.count({
        where: {
          slug: {
            startsWith: newSlug
          }
        }
      });
      finalSlug = `${newSlug}-${count + 1}`;
    }

    // Actualizar persona
    const updatedPerson = await prisma.person.update({
      where: { id },
      data: {
        firstName,
        lastName,
        slug: finalSlug,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      person: updatedPerson
    });

  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Error al actualizar persona' },
      { status: 500 }
    );
  }
}