// src/app/api/people/slug/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api/api-handler';

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: { slug: string } }
) => {
    const person = await prisma.person.findFirst({
      where: {
        slug: params.slug,
        isActive: true
      },
      include: {
        birthLocation: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
                }
              }
            }
          }
        },
        deathLocation: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
                }
              }
            }
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
        },
        alternativeNames: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        // Imágenes en las que aparece la persona
        imageAppearances: {
          include: {
            image: {
              include: {
                movie: {
                  select: {
                    id: true,
                    title: true,
                    releaseYear: true
                  }
                },
                people: {
                  include: {
                    person: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true
                      }
                    }
                  },
                  orderBy: {
                    position: 'asc'
                  }
                }
              }
            }
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

    // Transformar imágenes al formato esperado por el componente ImageGallery
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const galleryImages = person.imageAppearances.map((appearance) => {
      const img = appearance.image;
      return {
        id: img.id,
        url: `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${img.cloudinaryPublicId}`,
        cloudinaryPublicId: img.cloudinaryPublicId,
        type: img.type,
        eventName: img.eventName,
        people: img.people.map((p) => ({
          personId: p.personId,
          position: p.position,
          person: {
            id: p.person.id,
            firstName: p.person.firstName,
            lastName: p.person.lastName
          }
        })),
        movie: img.movie ? {
          id: img.movie.id,
          title: img.movie.title,
          releaseYear: img.movie.releaseYear
        } : null
      };
    });

    // Retornar persona con imágenes transformadas
    const { imageAppearances, ...personData } = person;
    return NextResponse.json({
      ...personData,
      galleryImages
    });
}, 'obtener persona')