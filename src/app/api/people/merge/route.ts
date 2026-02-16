// src/app/api/people/merge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePersonSlug } from '@/lib/people/peopleUtils';
import RedisClient from '@/lib/redis';

/** Strip diacritics (tildes, dieresis, etc.) for name comparison */
function normalizeForComparison(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface MergeResolutions {
  [field: string]: 'A' | 'B';
}

interface MergeRequest {
  personAId: number;
  personBId: number;
  survivorId?: number;
  resolutions: MergeResolutions;
}

export async function POST(request: NextRequest) {
  try {
    const body: MergeRequest = await request.json();
    const { personAId, personBId, survivorId, resolutions } = body;

    if (!personAId || !personBId) {
      return NextResponse.json(
        { message: 'Se requieren ambos IDs de personas' },
        { status: 400 }
      );
    }

    if (personAId === personBId) {
      return NextResponse.json(
        { message: 'No se puede mergear una persona consigo misma' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch both persons with full data
      const personInclude = {
        alternativeNames: true,
        links: true,
        nationalities: true,
        birthLocation: true,
        deathLocation: true,
        _count: {
          select: { castRoles: true, crewRoles: true }
        }
      };

      const [personA, personB] = await Promise.all([
        tx.person.findUnique({ where: { id: personAId }, include: personInclude }),
        tx.person.findUnique({ where: { id: personBId }, include: personInclude }),
      ]);

      if (!personA || !personB) {
        throw new Error('Una o ambas personas no fueron encontradas');
      }

      // 2. Determine survivor and absorbed
      let survivor = personA;
      let absorbed = personB;

      if (survivorId) {
        if (survivorId === personBId) {
          survivor = personB;
          absorbed = personA;
        }
      } else {
        const movieCountA = personA._count.castRoles + personA._count.crewRoles;
        const movieCountB = personB._count.castRoles + personB._count.crewRoles;
        if (movieCountB > movieCountA) {
          survivor = personB;
          absorbed = personA;
        }
      }

      // Helper: resolve a field - returns the value to set on the survivor
      // 'A' always means personA's value, 'B' always means personB's value
      const personAId_local = personA.id;
      function resolveValue(field: string, valA: any, valB: any): any {
        const choice = resolutions[field];
        if (choice === 'A') return valA;
        if (choice === 'B') return valB;
        // No resolution: auto-fill from absorbed if survivor is empty
        const survivorVal = survivor.id === personAId_local ? valA : valB;
        const absorbedVal = survivor.id === personAId_local ? valB : valA;
        if (survivorVal === null || survivorVal === undefined || survivorVal === '') {
          return absorbedVal;
        }
        return survivorVal;
      }

      // 3. Build update data for survivor
      const updateData: any = {};

      // Name resolution
      const nameA = [personA.firstName, personA.lastName].filter(Boolean).join(' ');
      const nameB = [personB.firstName, personB.lastName].filter(Boolean).join(' ');
      let losingName: string | null = null;

      if (resolutions.name) {
        const chosenPerson = resolutions.name === 'A' ? personA : personB;
        const losingPerson = resolutions.name === 'A' ? personB : personA;
        updateData.firstName = chosenPerson.firstName;
        updateData.lastName = chosenPerson.lastName;
        losingName = [losingPerson.firstName, losingPerson.lastName].filter(Boolean).join(' ');
      } else if (normalizeForComparison(nameA) !== normalizeForComparison(nameB)) {
        // Names differ but no resolution provided, keep survivor's name
        losingName = survivor.id === personA.id
          ? [personB.firstName, personB.lastName].filter(Boolean).join(' ')
          : [personA.firstName, personA.lastName].filter(Boolean).join(' ');
      } else {
        // Names are the same, no change needed
        losingName = null;
      }

      // Scalar fields
      updateData.realName = resolveValue('realName', personA.realName, personB.realName) || null;

      // Birth date (treated as group)
      if (resolutions.birthDate) {
        const chosen = resolutions.birthDate === 'A' ? personA : personB;
        updateData.birthYear = chosen.birthYear;
        updateData.birthMonth = chosen.birthMonth;
        updateData.birthDay = chosen.birthDay;
      } else {
        // Auto-fill: if survivor has no birthYear, take from absorbed
        const survivorBirthYear = survivor.birthYear;
        const absorbedBirthYear = absorbed.birthYear;
        if (!survivorBirthYear && absorbedBirthYear) {
          updateData.birthYear = absorbed.birthYear;
          updateData.birthMonth = absorbed.birthMonth;
          updateData.birthDay = absorbed.birthDay;
        }
      }

      // Death date (treated as group)
      if (resolutions.deathDate) {
        const chosen = resolutions.deathDate === 'A' ? personA : personB;
        updateData.deathYear = chosen.deathYear;
        updateData.deathMonth = chosen.deathMonth;
        updateData.deathDay = chosen.deathDay;
      } else {
        const survivorDeathYear = survivor.deathYear;
        const absorbedDeathYear = absorbed.deathYear;
        if (!survivorDeathYear && absorbedDeathYear) {
          updateData.deathYear = absorbed.deathYear;
          updateData.deathMonth = absorbed.deathMonth;
          updateData.deathDay = absorbed.deathDay;
        }
      }

      // Birth location
      if (resolutions.birthLocation) {
        const chosen = resolutions.birthLocation === 'A' ? personA : personB;
        updateData.birthLocationId = chosen.birthLocationId;
      } else if (!survivor.birthLocationId && absorbed.birthLocationId) {
        updateData.birthLocationId = absorbed.birthLocationId;
      }

      // Death location
      if (resolutions.deathLocation) {
        const chosen = resolutions.deathLocation === 'A' ? personA : personB;
        updateData.deathLocationId = chosen.deathLocationId;
      } else if (!survivor.deathLocationId && absorbed.deathLocationId) {
        updateData.deathLocationId = absorbed.deathLocationId;
      }

      // Biography
      updateData.biography = resolveValue('biography', personA.biography, personB.biography) || null;

      // Photo
      if (resolutions.photo) {
        const chosen = resolutions.photo === 'A' ? personA : personB;
        updateData.photoUrl = chosen.photoUrl;
        updateData.photoPublicId = chosen.photoPublicId;
      } else if (!survivor.photoUrl && absorbed.photoUrl) {
        updateData.photoUrl = absorbed.photoUrl;
        updateData.photoPublicId = absorbed.photoPublicId;
      }

      // Gender
      updateData.gender = resolveValue('gender', personA.gender, personB.gender) || null;

      // IMDb ID
      updateData.imdbId = resolveValue('imdbId', personA.imdbId, personB.imdbId) || null;

      // TMDB ID
      const resolvedTmdbId = resolveValue('tmdbId', personA.tmdbId, personB.tmdbId);
      updateData.tmdbId = resolvedTmdbId || null;

      // Also carry over tmdbPopularity if we're taking the absorbed person's tmdbId
      if (updateData.tmdbId && updateData.tmdbId !== survivor.tmdbId) {
        const sourceForTmdb = updateData.tmdbId === personA.tmdbId ? personA : personB;
        updateData.tmdbPopularity = sourceForTmdb.tmdbPopularity;
        updateData.tmdbPopularityUpdatedAt = sourceForTmdb.tmdbPopularityUpdatedAt;
      }

      // 4. Migrate PersonAlternativeName (must happen first for altNameId mapping)
      const absorbedAltNames = await tx.personAlternativeName.findMany({
        where: { personId: absorbed.id }
      });
      const survivorAltNames = await tx.personAlternativeName.findMany({
        where: { personId: survivor.id }
      });
      const survivorAltNameMap = new Map(
        survivorAltNames.map(a => [normalizeForComparison(a.fullName), a.id])
      );

      const altNameIdMap: Record<number, number> = {};

      for (const altName of absorbedAltNames) {
        const existingId = survivorAltNameMap.get(normalizeForComparison(altName.fullName));
        if (existingId) {
          // Duplicate - map old to existing, then update references and delete
          altNameIdMap[altName.id] = existingId;

          // Update cast/crew that reference this alt name to point to survivor's alt name
          await tx.movieCast.updateMany({
            where: { alternativeNameId: altName.id },
            data: { alternativeNameId: existingId }
          });
          await tx.movieCrew.updateMany({
            where: { alternativeNameId: altName.id },
            data: { alternativeNameId: existingId }
          });

          await tx.personAlternativeName.delete({ where: { id: altName.id } });
        } else {
          // Unique - transfer to survivor
          await tx.personAlternativeName.update({
            where: { id: altName.id },
            data: { personId: survivor.id }
          });
          altNameIdMap[altName.id] = altName.id;
          survivorAltNameMap.set(normalizeForComparison(altName.fullName), altName.id);
        }
      }

      // Add losing name as alt name if not already present
      if (losingName && losingName.trim() && !survivorAltNameMap.has(normalizeForComparison(losingName))) {
        // Also check it's not the same as survivor's current name
        const survivorName = [survivor.firstName, survivor.lastName].filter(Boolean).join(' ');
        // After name resolution, the survivor's name might have changed
        const finalSurvivorName = updateData.firstName !== undefined
          ? [updateData.firstName, updateData.lastName].filter(Boolean).join(' ')
          : survivorName;

        if (normalizeForComparison(losingName) !== normalizeForComparison(finalSurvivorName)) {
          await tx.personAlternativeName.create({
            data: { personId: survivor.id, fullName: losingName.trim() }
          });
        }
      }

      // 5. Migrate MovieCast
      const absorbedCast = await tx.movieCast.findMany({
        where: { personId: absorbed.id }
      });
      const survivorCast = await tx.movieCast.findMany({
        where: { personId: survivor.id }
      });
      const survivorCastByMovie = new Map<number, typeof survivorCast[0]>();
      for (const c of survivorCast) {
        survivorCastByMovie.set(c.movieId, c);
      }

      let castTransferred = 0;
      let castDeleted = 0;

      for (const cast of absorbedCast) {
        const existingSurvivorCast = survivorCastByMovie.get(cast.movieId);

        // Remap alternativeNameId
        let newAltNameId = cast.alternativeNameId;
        if (newAltNameId && altNameIdMap[newAltNameId] !== undefined) {
          newAltNameId = altNameIdMap[newAltNameId];
        }

        if (existingSurvivorCast) {
          // Duplicate by movieId - copy characterName if survivor's is null
          if (!existingSurvivorCast.characterName && cast.characterName) {
            await tx.movieCast.update({
              where: { id: existingSurvivorCast.id },
              data: { characterName: cast.characterName }
            });
          }
          // Delete absorbed's record
          await tx.movieCast.delete({ where: { id: cast.id } });
          castDeleted++;
        } else {
          // Unique - transfer to survivor
          await tx.movieCast.update({
            where: { id: cast.id },
            data: {
              personId: survivor.id,
              alternativeNameId: newAltNameId,
            }
          });
          castTransferred++;
        }
      }

      // 6. Migrate MovieCrew
      const absorbedCrew = await tx.movieCrew.findMany({
        where: { personId: absorbed.id }
      });
      const survivorCrew = await tx.movieCrew.findMany({
        where: { personId: survivor.id }
      });
      const survivorCrewKeys = new Set(
        survivorCrew.map(c => `${c.movieId}:${c.roleId}`)
      );

      let crewTransferred = 0;
      let crewDeleted = 0;

      for (const crew of absorbedCrew) {
        const key = `${crew.movieId}:${crew.roleId}`;

        // Remap alternativeNameId
        let newAltNameId = crew.alternativeNameId;
        if (newAltNameId && altNameIdMap[newAltNameId] !== undefined) {
          newAltNameId = altNameIdMap[newAltNameId];
        }

        if (survivorCrewKeys.has(key)) {
          // Duplicate - delete absorbed's
          await tx.movieCrew.delete({ where: { id: crew.id } });
          crewDeleted++;
        } else {
          // Unique - transfer to survivor
          await tx.movieCrew.update({
            where: { id: crew.id },
            data: {
              personId: survivor.id,
              alternativeNameId: newAltNameId,
            }
          });
          crewTransferred++;
        }
      }

      // 7. Migrate PersonLink
      const absorbedLinks = await tx.personLink.findMany({
        where: { personId: absorbed.id }
      });
      const survivorLinkUrls = new Set(
        (await tx.personLink.findMany({ where: { personId: survivor.id } }))
          .map(l => l.url)
      );

      let linksTransferred = 0;
      for (const link of absorbedLinks) {
        if (survivorLinkUrls.has(link.url)) {
          await tx.personLink.delete({ where: { id: link.id } });
        } else {
          await tx.personLink.update({
            where: { id: link.id },
            data: { personId: survivor.id }
          });
          linksTransferred++;
        }
      }

      // 8. Migrate PersonNationality (composite PK - must delete and recreate)
      const absorbedNats = await tx.personNationality.findMany({
        where: { personId: absorbed.id }
      });
      const survivorNatIds = new Set(
        (await tx.personNationality.findMany({ where: { personId: survivor.id } }))
          .map(n => n.locationId)
      );

      let nationalitiesAdded = 0;
      for (const nat of absorbedNats) {
        await tx.personNationality.delete({
          where: {
            personId_locationId: {
              personId: absorbed.id,
              locationId: nat.locationId
            }
          }
        });
        if (!survivorNatIds.has(nat.locationId)) {
          await tx.personNationality.create({
            data: {
              personId: survivor.id,
              locationId: nat.locationId,
              isPrimary: nat.isPrimary,
            }
          });
          nationalitiesAdded++;
        }
      }

      // 9. Migrate ImagePerson
      const absorbedImages = await tx.imagePerson.findMany({
        where: { personId: absorbed.id }
      });
      const survivorImageIds = new Set(
        (await tx.imagePerson.findMany({ where: { personId: survivor.id } }))
          .map(i => i.imageId)
      );

      let imageAppearancesTransferred = 0;
      for (const img of absorbedImages) {
        if (survivorImageIds.has(img.imageId)) {
          await tx.imagePerson.delete({ where: { id: img.id } });
        } else {
          await tx.imagePerson.update({
            where: { id: img.id },
            data: { personId: survivor.id }
          });
          imageAppearancesTransferred++;
        }
      }

      // 10. Reassign MovieAward
      const awardsReassigned = await tx.movieAward.updateMany({
        where: { recipientPersonId: absorbed.id },
        data: { recipientPersonId: survivor.id }
      });

      // 11. Reassign FestivalJury (has unique constraint sectionId + personId)
      const absorbedJury = await tx.festivalJury.findMany({
        where: { personId: absorbed.id }
      });
      const survivorJurySections = new Set(
        (await tx.festivalJury.findMany({ where: { personId: survivor.id } }))
          .map(j => j.sectionId)
      );

      let festivalJuryReassigned = 0;
      for (const jury of absorbedJury) {
        if (survivorJurySections.has(jury.sectionId)) {
          await tx.festivalJury.delete({ where: { id: jury.id } });
        } else {
          await tx.festivalJury.update({
            where: { id: jury.id },
            data: { personId: survivor.id }
          });
          festivalJuryReassigned++;
        }
      }

      // 12. Reassign FestivalAwardWinner
      const festivalAwardsReassigned = await tx.festivalAwardWinner.updateMany({
        where: { personId: absorbed.id },
        data: { personId: survivor.id }
      });

      // 13. Reassign PageView
      const pageViewsReassigned = await tx.pageView.updateMany({
        where: { personId: absorbed.id },
        data: { personId: survivor.id }
      });

      // 14. Update survivor's slug if name changed
      if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
        const newFirstName = updateData.firstName !== undefined ? updateData.firstName : survivor.firstName;
        const newLastName = updateData.lastName !== undefined ? updateData.lastName : survivor.lastName;

        if (newFirstName !== survivor.firstName || newLastName !== survivor.lastName) {
          let baseSlug = generatePersonSlug(newFirstName, newLastName);
          let slug = baseSlug;
          let counter = 1;

          while (true) {
            const existing = await tx.person.findUnique({
              where: { slug },
              select: { id: true },
            });
            if (!existing || existing.id === survivor.id) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          updateData.slug = slug;
        }
      }

      // 15. Update survivor with resolved data
      updateData.hasLinks = (await tx.personLink.count({ where: { personId: survivor.id } })) > 0;

      await tx.person.update({
        where: { id: survivor.id },
        data: updateData,
      });

      // 16. Delete absorbed person
      await tx.person.delete({ where: { id: absorbed.id } });

      return {
        survivorId: survivor.id,
        absorbedId: absorbed.id,
        survivorSlug: updateData.slug || survivor.slug,
        stats: {
          castRolesTransferred: castTransferred,
          castRolesDeleted: castDeleted,
          crewRolesTransferred: crewTransferred,
          crewRolesDeleted: crewDeleted,
          linksTransferred,
          nationalitiesAdded,
          imageAppearancesTransferred,
          awardsReassigned: awardsReassigned.count,
          festivalJuryReassigned,
          festivalAwardWinnersReassigned: festivalAwardsReassigned.count,
          pageViewsReassigned: pageViewsReassigned.count,
        }
      };
    }, {
      timeout: 30000, // 30 seconds for complex merges
    });

    // Invalidate caches for both persons
    const cacheKeysToInvalidate = [
      `person:id:${result.survivorId}:v1`,
      `person:id:${result.absorbedId}:v1`,
      `person:filmography:${result.survivorId}:v1`,
      `person:filmography:${result.survivorId}:v2`,
      `person:filmography:${result.absorbedId}:v1`,
      `person:filmography:${result.absorbedId}:v2`,
      `person:slug:${result.survivorSlug}:v1`,
      'people-list:v1',
    ];

    await Promise.all(
      cacheKeysToInvalidate.map(key =>
        RedisClient.del(key).catch(err =>
          console.error(`Error invalidando Redis key ${key}:`, err)
        )
      )
    );

    console.log(`✅ Merge completado: persona ${result.absorbedId} absorbida por ${result.survivorId}`);
    console.log(`   Stats:`, result.stats);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error executing merge:', error);
    return NextResponse.json(
      { message: error.message || 'Error al ejecutar el merge' },
      { status: 500 }
    );
  }
}
