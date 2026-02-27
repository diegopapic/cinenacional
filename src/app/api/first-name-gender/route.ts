// src/app/api/first-name-gender/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api/api-handler';

/**
 * GET /api/first-name-gender?name=Juan
 * Busca un nombre en la tabla first_name_genders y devuelve su género
 */
export const GET = apiHandler(async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || name.trim().length === 0) {
        return NextResponse.json(
            { error: 'El parámetro "name" es requerido' },
            { status: 400 }
        );
    }

    // Convierte todo a minúsculas: "Josefina" → "josefina" ✅
    const normalizedName = name.trim().toLowerCase();

    const result = await prisma.firstNameGender.findUnique({
        where: { name: normalizedName }
    });

    if (!result) {
        return NextResponse.json({
            found: false,
            name: normalizedName,
            gender: null
        });
    }

    return NextResponse.json({
        found: true,
        name: result.name,
        gender: result.gender // MALE, FEMALE, o UNISEX
    });
}, 'buscar el nombre');

/**
 * POST /api/first-name-gender
 * Agrega o actualiza un nombre en la tabla first_name_genders
 * Body: { name: string, gender: 'MALE' | 'FEMALE' }
 *
 * Solo se agregan nombres con género MALE o FEMALE.
 * Los UNISEX o desconocidos no se agregan automáticamente.
 */
export const POST = apiHandler(async (request: NextRequest) => {
    const data = await request.json();
    const { name, gender } = data;

    if (!name || name.trim().length === 0) {
        return NextResponse.json(
            { error: 'El nombre es requerido' },
            { status: 400 }
        );
    }

    // Solo permitir MALE o FEMALE para agregar a la tabla
    if (!['MALE', 'FEMALE'].includes(gender)) {
        return NextResponse.json(
            { error: 'El género debe ser MALE o FEMALE para agregarlo a la base de datos' },
            { status: 400 }
        );
    }


    const normalizedName = name.trim().toLowerCase();

    // Usar upsert para crear o actualizar
    const result = await prisma.firstNameGender.upsert({
        where: { name: normalizedName },
        update: { gender: gender },
        create: {
            name: normalizedName,
            gender: gender
        }
    });

    console.log(`✅ Nombre "${normalizedName}" guardado con género ${gender}`);

    return NextResponse.json({
        success: true,
        data: result
    }, { status: 201 });
}, 'guardar el nombre');
