// src/app/pelicula/[slug]/MoviePageClient.tsx

'use client';

import { MovieHero } from "@/components/movies/MovieHero";
import { CastSection } from "@/components/movies/CastSection";
import { CrewSection } from "@/components/movies/CrewSection";
import { FilmTechnical } from "@/components/movies/FilmTechnical";
import { FilmExternalLinks } from "@/components/movies/FilmExternalLinks";
import { ImageGallery } from "@/components/movies/ImageGallery";
import { usePageView } from '@/hooks/usePageView';

// Componente de anuncios
import AdBanner from "@/components/ads/AdBanner";

interface CastMember {
    name: string;
    character: string;
    image?: string;
    isPrincipal?: boolean;
    billingOrder?: number;
    personId?: number;
    personSlug?: string;
}

interface CrewMember {
    name: string;
    role: string;
    personSlug?: string;
}

interface CrewDepartment {
    [department: string]: CrewMember[];
}

// Tipo para las imágenes de galería con datos para caption
interface GalleryImage {
    id: number;
    url: string;
    cloudinaryPublicId: string;
    type: string;
    eventName?: string | null;
    people: Array<{
        personId: number;
        position: number;
        person: {
            id: number;
            firstName?: string | null;
            lastName?: string | null;
        }
    }>;
    movie?: {
        id: number;
        title: string;
        releaseYear?: number | null;
    } | null;
}

interface Director {
    id: number;
    name: string;
    slug: string;
}

interface MoviePageClientProps {
    movie: any;
    displayYear: number | null;
    totalDuration: number;
    genres: Array<{ id: number; name: string }>;
    themes: Array<{ id: number; name: string; slug?: string }>;
    countries: Array<{ id: number; name: string }>;
    rating?: { id: number; name: string; description?: string; abbreviation?: string | null } | null;
    colorType?: { id: number; name: string } | null;
    soundType?: string | null;
    mainCast: CastMember[];
    fullCast: CastMember[];
    basicCrew: CrewDepartment;
    fullCrew: CrewDepartment;
    premiereVenues: string;
    releaseDate?: {
        day: number | null;
        month: number | null;
        year: number | null;
    } | null;
    heroBackgroundImage?: string | null;
    galleryImages?: GalleryImage[];
    directors?: Director[];
    productionType?: string | null;
    externalLinks?: Array<{ type: string; url: string }>;
}

// Slots de AdSense
const AD_SLOTS = {
    POST_INFO: '8509488902',
    SIDEBAR: '8621169545',
    CAST_CREW: '7432210959',
    PRE_TRAILER: '7308087870',
    MULTIPLEX: '6191938018',
};

export function MoviePageClient({
    movie,
    displayYear,
    totalDuration,
    genres,
    themes,
    countries,
    rating,
    colorType,
    soundType,
    mainCast,
    fullCast,
    basicCrew,
    fullCrew,
    premiereVenues,
    releaseDate,
    heroBackgroundImage,
    galleryImages = [],
    directors = [],
    productionType,
    externalLinks = []
}: MoviePageClientProps) {
    usePageView({ pageType: 'MOVIE', movieId: movie.id });

    return (
        <div className="bg-background text-foreground min-h-screen">
            {/* Film Hero — poster + info + trailer modal */}
            <MovieHero
                title={movie.title}
                year={displayYear}
                duration={totalDuration}
                genres={genres}
                posterUrl={movie.posterUrl}
                releaseDate={releaseDate}
                premiereVenues={premiereVenues}
                rating={rating}
                heroBackgroundImage={heroBackgroundImage}
                synopsis={movie.synopsis}
                countries={countries}
                trailerUrl={movie.trailerUrl}
                colorType={colorType}
                soundType={soundType}
                stage={movie.stage}
                directors={directors}
                productionType={productionType}
            />

            {/* Ad after hero */}
            {/* <AdBanner slot={AD_SLOTS.POST_INFO} format="in-article" /> */}

            {/* Cast & Crew */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
                <CastSection
                    mainCast={mainCast}
                    fullCast={fullCast}
                />

                <CrewSection
                    basicCrew={basicCrew}
                    fullCrew={fullCrew}
                />

                <div className="mt-12">
                    <FilmTechnical
                        year={displayYear}
                        duration={totalDuration}
                        rating={rating}
                        countries={countries}
                        releaseDate={releaseDate}
                        premiereVenues={premiereVenues}
                        genres={genres}
                        themes={themes}
                        colorType={colorType}
                        soundType={soundType}
                        productionType={productionType}
                    />
                </div>

                {/* External Links */}
                {externalLinks.length > 0 && (
                    <div className="mt-12">
                        <FilmExternalLinks links={externalLinks} />
                    </div>
                )}

                {/* Image Gallery */}
                {galleryImages.length > 0 && (
                    <div className="mt-12">
                        <ImageGallery
                            images={galleryImages}
                            movieTitle={movie.title}
                        />
                    </div>
                )}

            </div>

            {/* Multiplex ad */}
            {/* <div className="border-t border-border/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-[13px] text-muted-foreground/50 mb-4">También te puede interesar</p>
                    <AdBanner slot={AD_SLOTS.MULTIPLEX} format="multiplex" />
                </div>
            </div> */}
        </div>
    );
}
