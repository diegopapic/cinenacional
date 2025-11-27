// src/app/api/people/slug/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const person = await prisma.person.findFirst({
      where: {
        slug: params.slug,
        isActive: true
      },
      include: {
        birthLocation: {
          include: {
            parent: true
          }
        },
        deathLocation: {
          include: {
            parent: true
          }
        },
        links: {
          where: {
            isActive: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        },
        nationalities: {
          include: {
            location: true
          }
        }
      }
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error fetching person by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person' },
      { status: 500 }
    );
  }
}