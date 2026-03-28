// src/app/pelicula/[slug]/MoviePageClient.tsx

'use client';

import { MovieHero } from "@/components/movies/MovieHero";
import { CastSection } from "@/components/movies/CastSection";
import { CrewSection } from "@/components/movies/CrewSection";
import { FilmTechnical } from "@/components/movies/FilmTechnical";
import { ExternalLinks } from "@/components/shared/ExternalLinks";
import { ImageGallery } from "@/components/movies/ImageGallery";
import { AdditionalData } from "@/components/movies/AdditionalData";
import { ReviewsSection } from "@/components/movies/ReviewsSection";
import { usePageView } from '@/hooks/usePageView';

interface CastMember {
    name: string;
    character: string | null;
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
    movie: {
        id: number;
        slug: string;
        title: string;
        posterUrl?: string | null;
        synopsis?: string | null;
        trailerUrl?: string | null;
        stage?: string;
    };
    synopsis?: string | null;
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
    alternativeTitles?: Array<{ id: number; title: string; description?: string | null }>;
    trivia?: Array<{ id: number; content: string; sortOrder: number }>;
    reviews?: Array<{
        id: number;
        title?: string | null;
        summary?: string | null;
        url?: string | null;
        content?: string | null;
        language?: string;
        hasPaywall: boolean;
        score?: number | null;
        publishYear?: number | null;
        publishMonth?: number | null;
        publishDay?: number | null;
        author?: { id: number; firstName?: string | null; lastName?: string | null; slug: string } | null;
        mediaOutlet?: { id: number; name: string; url?: string | null } | null;
    }>;
}


export function MoviePageClient({
    movie,
    synopsis,
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
    externalLinks = [],
    alternativeTitles = [],
    trivia = [],
    reviews = [],
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
                synopsis={synopsis}
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
                        <ExternalLinks links={externalLinks} />
                    </div>
                )}

                {/* Datos adicionales */}
                {(alternativeTitles.length > 0 || trivia.length > 0) && (
                    <div className="mt-12">
                        <AdditionalData
                            alternativeTitles={alternativeTitles}
                            trivia={trivia}
                        />
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

                {/* Críticas */}
                {reviews.length > 0 && (
                    <div className="mt-12">
                        <ReviewsSection reviews={reviews} movieSlug={movie.slug} />
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
