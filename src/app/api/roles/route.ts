// src/app/api/roles/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { roleSchema, Department } from '@/lib/roles/rolesTypes';
import { generateSlug } from '@/lib/utils/slugs';
import { requireAuth } from '@/lib/auth';

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
    const sortBy = searchParams.get('sortBy') || 'usage';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Si hay búsqueda, usar unaccent
    if (search && search.trim().length >= 2) {
      try {
        const searchPattern = `%${search.toLowerCase().trim()}%`;
        
        // Buscar con unaccent
        const rolesWithSearch = await prisma.$queryRaw<{id: number}[]>`
          SELECT id
          FROM roles
          WHERE 
            unaccent(LOWER(name)) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(description, ''))) LIKE unaccent(${searchPattern})
        `;
        
        if (rolesWithSearch.length === 0) {
          return NextResponse.json({
            data: [],
            totalCount: 0,
            page,
            totalPages: 0,
            hasMore: false
          });
        }
        
        // Construir where para los IDs encontrados
        const where: any = {
          id: { in: rolesWithSearch.map(r => r.id) }
        };
        
        // Agregar filtros adicionales
        if (department && Object.values(Department).includes(department)) {
          where.department = department;
        }
        
        if (isActive !== null && isActive !== '') {
          where.isActive = isActive === 'true';
        }
        
        if (isMainRole !== null && isMainRole !== '') {
          where.isMainRole = isMainRole === 'true';
        }
        
        // Obtener roles completos
        const roles = await prisma.role.findMany({
          where,
          include: {
            _count: {
              select: {
                crewRoles: true
              }
            }
          }
        });
        
        // Ordenar según sortBy
        if (sortBy === 'usage') {
          roles.sort((a, b) => {
            const countA = a._count?.crewRoles || 0;
            const countB = b._count?.crewRoles || 0;
            return sortOrder === 'desc' ? countB - countA : countA - countB;
          });
        } else if (sortBy === 'name') {
          roles.sort((a, b) => {
            return sortOrder === 'desc' 
              ? b.name.localeCompare(a.name)
              : a.name.localeCompare(b.name);
          });
        }
        
        // Paginar manualmente
        const paginatedRoles = roles.slice(offset, offset + limit);
        const totalCount = roles.length;
        const totalPages = Math.ceil(totalCount / limit);
        
        if (exportFormat === 'csv') {
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
        
        return NextResponse.json({
          data: paginatedRoles,
          totalCount,
          page,
          totalPages,
          hasMore: page < totalPages
        });
        
      } catch (error) {
        console.error('Error con unaccent:', error);
        // Continuar con búsqueda normal
      }
    }

    // Búsqueda normal sin unaccent
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

    // El resto del código continúa igual...
    let orderBy: any;
    
    if (sortBy === 'usage') {
      // Para ordenar por uso necesitamos hacerlo manualmente
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

      rolesWithCount.sort((a, b) => {
        const countA = a._count?.crewRoles || 0;
        const countB = b._count?.crewRoles || 0;
        return sortOrder === 'desc' ? countB - countA : countA - countB;
      });

      const paginatedRoles = rolesWithCount.slice(offset, offset + limit);
      const totalCount = rolesWithCount.length;
      const totalPages = Math.ceil(totalCount / limit);

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
        orderBy = [
          { department: 'asc' },
          { name: 'asc' }
        ];
      }

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
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json();

    const validatedData = roleSchema.parse(body);
    
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.role.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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