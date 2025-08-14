// src/app/api/people/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePersonSlug } from '@/lib/people/peopleUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({
      where: { id: parseInt(id) },
      include: {
        links: {
          orderBy: { displayOrder: 'asc' },
        },
        birthLocation: true,
        deathLocation: true,
        _count: {
          select: {
            castRoles: true,
            crewRoles: true,
            awards: true,
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { message: 'Persona no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { message: 'Error al obtener persona' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const personId = parseInt(id);
    
    // Verificar si necesitamos actualizar el slug
    let slug = undefined;
    const currentPerson = await prisma.person.findUnique({
      where: { id: personId },
      select: { firstName: true, lastName: true, slug: true },
    });

    if (currentPerson) {
      const nameChanged = 
        currentPerson.firstName !== data.firstName || 
        currentPerson.lastName !== data.lastName;
      
      if (nameChanged) {
        // Generar nuevo slug si cambió el nombre
        let baseSlug = generatePersonSlug(data.firstName, data.lastName);
        slug = baseSlug;
        let counter = 1;
        
        // Verificar que el nuevo slug no exista (excepto para la persona actual)
        while (true) {
          const existing = await prisma.person.findUnique({
            where: { slug },
            select: { id: true },
          });
          
          if (!existing || existing.id === personId) break;
          
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      ...(slug && { slug }),
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      realName: data.realName || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      deathDate: data.deathDate ? new Date(data.deathDate) : null,
      biography: data.biography || null,
      photoUrl: data.photoUrl || null,
      gender: data.gender || null,
      hideAge: data.hideAge || false,
      isActive: data.isActive ?? true,
      hasLinks: data.links && data.links.length > 0,
    };

    // Actualizar persona y links en una transacción
    const person = await prisma.$transaction(async (tx) => {
      // Actualizar la persona
      const updatedPerson = await tx.person.update({
        where: { id: personId },
        data: updateData,
      });

      // Eliminar links existentes
      await tx.personLink.deleteMany({
        where: { personId },
      });

      // Crear nuevos links si existen
      if (data.links && data.links.length > 0) {
        await tx.personLink.createMany({
          data: data.links.map((link: any, index: number) => ({
            personId,
            type: link.type,
            url: link.url,
            title: link.title || null,
            displayOrder: link.displayOrder ?? index,
            isVerified: link.isVerified || false,
            isActive: link.isActive ?? true,
          })),
        });
      }

      // Retornar la persona actualizada con sus relaciones
      return tx.person.findUnique({
        where: { id: personId },
        include: {
          links: true,
          _count: {
            select: {
              links: true,
              castRoles: true,
              crewRoles: true,
            },
          },
        },
      });
    });

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { message: 'Error al actualizar persona' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verificar si la persona tiene películas asociadas
    const person = await prisma.person.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            castRoles: true,
            crewRoles: true,
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { message: 'Persona no encontrada' },
        { status: 404 }
      );
    }

    const totalRoles = person._count.castRoles + person._count.crewRoles;
    if (totalRoles > 0) {
      return NextResponse.json(
        { 
          message: `No se puede eliminar esta persona porque está asociada a ${totalRoles} película(s)` 
        },
        { status: 400 }
      );
    }

    // Eliminar la persona (los links se eliminan en cascada)
    await prisma.person.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Persona eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json(
      { message: 'Error al eliminar persona' },
      { status: 500 }
    );
  }
}