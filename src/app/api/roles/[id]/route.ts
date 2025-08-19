// src/app/api/roles/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roleSchema } from '@/lib/roles/rolesTypes';
import { generateSlug } from '@/lib/utils/slugs';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            crewRoles: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(role);

  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = roleSchema.parse(body);

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Generar nuevo slug si cambió el nombre
    let slug = existingRole.slug;
    if (validatedData.name !== existingRole.name) {
      const baseSlug = generateSlug(validatedData.name);
      slug = baseSlug;
      let counter = 1;
      
      while (await prisma.role.findFirst({ 
        where: { 
          slug,
          id: { not: id }
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Actualizar rol
    const role = await prisma.role.update({
      where: { id },
      data: {
        ...validatedData,
        slug
      },
      include: {
        _count: {
          select: {
            crewRoles: true
          }
        }
      }
    });

    return NextResponse.json(role);

  } catch (error) {
    console.error('Error updating role:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar que el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            crewRoles: true
          }
        }
      }
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene relaciones activas
    if (existingRole._count.crewRoles > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el rol porque está asignado a películas'
        },
        { status: 400 }
      );
    }

    // Eliminar rol
    await prisma.role.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}