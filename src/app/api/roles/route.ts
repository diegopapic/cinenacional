// src/app/api/roles/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roleSchema, Department } from '@/lib/roles/rolesTypes';
import { generateSlug } from '@/lib/utils/slugs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') as Department;
    const isActive = searchParams.get('isActive');
    const isMainRole = searchParams.get('isMainRole');
    const exportFormat = searchParams.get('export');
    const sortBy = searchParams.get('sortBy') || 'usage'; // Por defecto ordenar por usos
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Construir where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (department && Object.values(Department).includes(department)) {
      where.department = department;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (isMainRole !== null && isMainRole !== '') {
      where.isMainRole = isMainRole === 'true';
    }

    // Configurar ordenamiento
    let orderBy: any;
    
    if (sortBy === 'usage') {
      // ORDENAR POR CANTIDAD DE USOS
      // Primero obtener todos los roles con sus conteos
      const rolesWithCount = await prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              crewRoles: true
            }
          }
        }
      });

      // Ordenar manualmente por count
      rolesWithCount.sort((a, b) => {
        const countA = a._count?.crewRoles || 0;
        const countB = b._count?.crewRoles || 0;
        return sortOrder === 'desc' ? countB - countA : countA - countB;
      });

      // Aplicar paginación manualmente
      const paginatedRoles = rolesWithCount.slice(offset, offset + limit);
      const totalCount = rolesWithCount.length;
      const totalPages = Math.ceil(totalCount / limit);

      // Para exportación CSV
      if (exportFormat === 'csv') {
        const csv = [
          'ID,Nombre,Departamento,Descripción,Principal,Activo,Usos',
          ...rolesWithCount.map(role => 
            `${role.id},"${role.name}","${role.department}","${role.description || ''}",${role.isMainRole ? 'Sí' : 'No'},${role.isActive ? 'Sí' : 'No'},${role._count.crewRoles}`
          )
        ].join('\n');

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="roles_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      return NextResponse.json({
        data: paginatedRoles,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages
      });
      
    } else {
      // Para otros ordenamientos
      if (sortBy === 'name') {
        orderBy = { name: sortOrder };
      } else if (sortBy === 'department') {
        orderBy = [
          { department: sortOrder },
          { name: 'asc' }
        ];
      } else if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      } else {
        // Por defecto, ordenar por departamento y nombre
        orderBy = [
          { department: 'asc' },
          { name: 'asc' }
        ];
      }

      // Para exportación CSV
      if (exportFormat === 'csv') {
        const roles = await prisma.role.findMany({
          where,
          include: {
            _count: {
              select: {
                crewRoles: true
              }
            }
          },
          orderBy
        });

        const csv = [
          'ID,Nombre,Departamento,Descripción,Principal,Activo,Usos',
          ...roles.map(role => 
            `${role.id},"${role.name}","${role.department}","${role.description || ''}",${role.isMainRole ? 'Sí' : 'No'},${role.isActive ? 'Sí' : 'No'},${role._count.crewRoles}`
          )
        ].join('\n');

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="roles_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      // Query principal con ordenamiento normal
      const [roles, totalCount] = await Promise.all([
        prisma.role.findMany({
          where,
          include: {
            _count: {
              select: {
                crewRoles: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.role.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        data: roles,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages
      });
    }

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos
    const validatedData = roleSchema.parse(body);
    
    // Generar slug único
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.role.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Crear rol
    const role = await prisma.role.create({
      data: {
        ...validatedData,
        slug,
        isActive: validatedData.isActive ?? true,
        isMainRole: validatedData.isMainRole ?? false
      },
      include: {
        _count: {
          select: {
            crewRoles: true
          }
        }
      }
    });

    return NextResponse.json(role, { status: 201 });

  } catch (error) {
    console.error('Error creating role:', error);
    
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