-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."image_type" AS ENUM ('POSTER', 'BACKDROP', 'STILL', 'BEHIND_SCENES');

-- CreateEnum
CREATE TYPE "public"."Department" AS ENUM ('DIRECCION', 'PRODUCCION', 'GUION', 'FOTOGRAFIA', 'ARTE', 'MONTAJE', 'SONIDO', 'MUSICA', 'VESTUARIO', 'MAQUILLAJE', 'EFECTOS', 'ANIMACION', 'OTROS');

-- CreateEnum
CREATE TYPE "public"."gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."person_link_type" AS ENUM ('IMDB', 'TMDB', 'CINENACIONAL', 'WIKIPEDIA', 'OFFICIAL_WEBSITE', 'PORTFOLIO', 'BLOG', 'INSTAGRAM', 'TWITTER', 'FACEBOOK', 'YOUTUBE', 'TIKTOK', 'LINKEDIN', 'VIMEO', 'LETTERBOXD', 'SPOTIFY', 'PODCAST', 'INTERVIEW', 'ARTICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."venue_type" AS ENUM ('CINEMA', 'STREAMING', 'TV_CHANNEL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."video_type" AS ENUM ('TRAILER', 'TEASER', 'BEHIND_SCENES', 'INTERVIEW', 'CLIP');

-- CreateEnum
CREATE TYPE "public"."award_result" AS ENUM ('WON', 'NOMINATED');

-- CreateEnum
CREATE TYPE "public"."data_completeness" AS ENUM ('BASIC_PRESS_KIT', 'FULL_PRESS_KIT', 'MAIN_CAST', 'MAIN_CREW', 'FULL_CAST', 'FULL_CREW');

-- CreateEnum
CREATE TYPE "public"."link_type" AS ENUM ('INSTAGRAM', 'TWITTER', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'WEBSITE');

-- CreateEnum
CREATE TYPE "public"."color_category" AS ENUM ('COLOR', 'BLACK_AND_WHITE', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."movie_stage" AS ENUM ('COMPLETA', 'EN_DESARROLLO', 'EN_POSTPRODUCCION', 'EN_PREPRODUCCION', 'EN_RODAJE', 'INCONCLUSA', 'INEDITA');

-- CreateTable
CREATE TABLE "public"."movies" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "year" INTEGER,
    "release_year" INTEGER,
    "release_month" SMALLINT,
    "release_day" SMALLINT,
    "duration" INTEGER,
    "duration_seconds" INTEGER,
    "tipo_duracion" VARCHAR(20),
    "synopsis" TEXT,
    "notes" TEXT,
    "tagline" VARCHAR(500),
    "poster_url" VARCHAR(500),
    "poster_public_id" VARCHAR(500),
    "trailer_url" VARCHAR(500),
    "imdb_id" VARCHAR(20),
    "stage" "public"."movie_stage" NOT NULL DEFAULT 'COMPLETA',
    "color_type_id" INTEGER,
    "sound_type" VARCHAR(50),
    "rating_id" INTEGER,
    "countries" TEXT[] DEFAULT ARRAY['Argentina']::TEXT[],
    "is_coproduction" BOOLEAN NOT NULL DEFAULT false,
    "production_type" TEXT NOT NULL DEFAULT 'national',
    "filming_start_year" INTEGER,
    "filming_start_month" SMALLINT,
    "filming_start_day" SMALLINT,
    "filming_end_year" INTEGER,
    "filming_end_month" SMALLINT,
    "filming_end_day" SMALLINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "data_completeness" "public"."data_completeness" NOT NULL DEFAULT 'BASIC_PRESS_KIT',
    "meta_description" TEXT,
    "meta_keywords" TEXT[],

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."screening_venues" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "public"."venue_type" NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "website" VARCHAR(500),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "province" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Argentina',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screening_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_screenings" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "screening_date" DATE,
    "end_date" DATE,
    "is_premiere" BOOLEAN NOT NULL DEFAULT false,
    "is_exclusive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_alternative_titles" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_alternative_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_links" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "type" "public"."link_type" NOT NULL,
    "url" TEXT NOT NULL,
    "title" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."people" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "real_name" VARCHAR(255),
    "birth_year" INTEGER,
    "birth_month" SMALLINT,
    "birth_day" SMALLINT,
    "death_year" INTEGER,
    "death_month" SMALLINT,
    "death_day" SMALLINT,
    "birth_location_id" INTEGER,
    "death_location_id" INTEGER,
    "biography" TEXT,
    "photo_url" VARCHAR(500),
    "gender" "public"."gender",
    "hide_age" BOOLEAN NOT NULL DEFAULT false,
    "has_links" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "photo_public_id" VARCHAR(255),

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_nationalities" (
    "person_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "person_nationalities_pkey" PRIMARY KEY ("person_id","location_id")
);

-- CreateTable
CREATE TABLE "public"."person_links" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "type" "public"."person_link_type" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "title" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."genres" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_companies" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "founded_year" INTEGER,
    "logo_url" VARCHAR(500),
    "website" VARCHAR(500),
    "country" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."distribution_companies" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "website" VARCHAR(500),
    "country" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_cast" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "character_name" VARCHAR(255),
    "billing_order" INTEGER,
    "is_principal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_cast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_crew" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "billing_order" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_genres" (
    "movie_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("movie_id","genre_id")
);

-- CreateTable
CREATE TABLE "public"."movie_production_companies" (
    "movie_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "movie_production_companies_pkey" PRIMARY KEY ("movie_id","company_id")
);

-- CreateTable
CREATE TABLE "public"."movie_distribution_companies" (
    "movie_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "territory" VARCHAR(100) NOT NULL DEFAULT 'Argentina',

    CONSTRAINT "movie_distribution_companies_pkey" PRIMARY KEY ("movie_id","company_id","territory")
);

-- CreateTable
CREATE TABLE "public"."color_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "category" "public"."color_category" NOT NULL,
    "technical_name" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "parent_id" INTEGER,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "gentilicio" VARCHAR(255),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_images" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "type" "public"."image_type" NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "photographer" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_videos" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(50),
    "video_key" VARCHAR(100),
    "type" "public"."video_type" NOT NULL,
    "title" VARCHAR(255),
    "duration" INTEGER,
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."awards" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "organization" VARCHAR(255),
    "country" VARCHAR(100),
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_awards" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "award_id" INTEGER NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "result" "public"."award_result" NOT NULL,
    "recipient_person_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."themes" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "department" "public"."Department" NOT NULL,
    "description" TEXT,
    "is_main_role" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ratings" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "abbreviation" VARCHAR(10),
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_themes" (
    "movie_id" INTEGER NOT NULL,
    "theme_id" INTEGER NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "movie_themes_pkey" PRIMARY KEY ("movie_id","theme_id")
);

-- CreateTable
CREATE TABLE "public"."countries" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_countries" (
    "movie_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "movie_countries_pkey" PRIMARY KEY ("movie_id","country_id")
);

-- CreateTable
CREATE TABLE "public"."languages" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "bio" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_ratings" (
    "user_id" INTEGER NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "rating" DECIMAL(3,1) NOT NULL,
    "review_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("user_id","movie_id")
);

-- CreateTable
CREATE TABLE "public"."user_watchlist" (
    "user_id" INTEGER NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlist_pkey" PRIMARY KEY ("user_id","movie_id")
);

-- CreateTable
CREATE TABLE "public"."user_watched" (
    "user_id" INTEGER NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watched_pkey" PRIMARY KEY ("user_id","movie_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "movies_slug_key" ON "public"."movies"("slug");

-- CreateIndex
CREATE INDEX "movies_slug_idx" ON "public"."movies"("slug");

-- CreateIndex
CREATE INDEX "movies_title_idx" ON "public"."movies"("title");

-- CreateIndex
CREATE INDEX "movies_year_idx" ON "public"."movies"("year");

-- CreateIndex
CREATE INDEX "movies_tipo_duracion_idx" ON "public"."movies"("tipo_duracion");

-- CreateIndex
CREATE INDEX "movies_rating_id_idx" ON "public"."movies"("rating_id");

-- CreateIndex
CREATE INDEX "movies_filming_start_year_idx" ON "public"."movies"("filming_start_year");

-- CreateIndex
CREATE INDEX "movies_filming_start_year_filming_start_month_idx" ON "public"."movies"("filming_start_year", "filming_start_month");

-- CreateIndex
CREATE INDEX "movies_is_coproduction_idx" ON "public"."movies"("is_coproduction");

-- CreateIndex
CREATE INDEX "movies_production_type_idx" ON "public"."movies"("production_type");

-- CreateIndex
CREATE INDEX "movies_color_type_id_idx" ON "public"."movies"("color_type_id");

-- CreateIndex
CREATE INDEX "movies_stage_idx" ON "public"."movies"("stage");

-- CreateIndex
CREATE INDEX "movies_release_year_idx" ON "public"."movies"("release_year");

-- CreateIndex
CREATE INDEX "movies_release_year_release_month_idx" ON "public"."movies"("release_year", "release_month");

-- CreateIndex
CREATE UNIQUE INDEX "screening_venues_slug_key" ON "public"."screening_venues"("slug");

-- CreateIndex
CREATE INDEX "screening_venues_name_idx" ON "public"."screening_venues"("name");

-- CreateIndex
CREATE INDEX "screening_venues_type_idx" ON "public"."screening_venues"("type");

-- CreateIndex
CREATE INDEX "screening_venues_is_active_idx" ON "public"."screening_venues"("is_active");

-- CreateIndex
CREATE INDEX "movie_screenings_movie_id_idx" ON "public"."movie_screenings"("movie_id");

-- CreateIndex
CREATE INDEX "movie_screenings_venue_id_idx" ON "public"."movie_screenings"("venue_id");

-- CreateIndex
CREATE INDEX "movie_screenings_screening_date_idx" ON "public"."movie_screenings"("screening_date");

-- CreateIndex
CREATE UNIQUE INDEX "movie_screenings_movie_id_venue_id_screening_date_key" ON "public"."movie_screenings"("movie_id", "venue_id", "screening_date");

-- CreateIndex
CREATE INDEX "movie_alternative_titles_movie_id_idx" ON "public"."movie_alternative_titles"("movie_id");

-- CreateIndex
CREATE INDEX "movie_alternative_titles_title_idx" ON "public"."movie_alternative_titles"("title");

-- CreateIndex
CREATE INDEX "movie_links_movie_id_idx" ON "public"."movie_links"("movie_id");

-- CreateIndex
CREATE INDEX "movie_links_type_idx" ON "public"."movie_links"("type");

-- CreateIndex
CREATE UNIQUE INDEX "people_slug_key" ON "public"."people"("slug");

-- CreateIndex
CREATE INDEX "people_slug_idx" ON "public"."people"("slug");

-- CreateIndex
CREATE INDEX "people_first_name_idx" ON "public"."people"("first_name");

-- CreateIndex
CREATE INDEX "people_last_name_idx" ON "public"."people"("last_name");

-- CreateIndex
CREATE INDEX "people_birth_location_id_idx" ON "public"."people"("birth_location_id");

-- CreateIndex
CREATE INDEX "people_death_location_id_idx" ON "public"."people"("death_location_id");

-- CreateIndex
CREATE INDEX "people_is_active_idx" ON "public"."people"("is_active");

-- CreateIndex
CREATE INDEX "people_birth_year_idx" ON "public"."people"("birth_year");

-- CreateIndex
CREATE INDEX "people_birth_year_birth_month_idx" ON "public"."people"("birth_year", "birth_month");

-- CreateIndex
CREATE INDEX "people_death_year_idx" ON "public"."people"("death_year");

-- CreateIndex
CREATE INDEX "people_death_year_death_month_idx" ON "public"."people"("death_year", "death_month");

-- CreateIndex
CREATE INDEX "person_links_person_id_idx" ON "public"."person_links"("person_id");

-- CreateIndex
CREATE INDEX "person_links_type_idx" ON "public"."person_links"("type");

-- CreateIndex
CREATE INDEX "person_links_is_active_idx" ON "public"."person_links"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "public"."genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "production_companies_slug_key" ON "public"."production_companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_companies_slug_key" ON "public"."distribution_companies"("slug");

-- CreateIndex
CREATE INDEX "movie_cast_movie_id_idx" ON "public"."movie_cast"("movie_id");

-- CreateIndex
CREATE INDEX "movie_cast_person_id_idx" ON "public"."movie_cast"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "movie_cast_movie_id_person_id_character_name_key" ON "public"."movie_cast"("movie_id", "person_id", "character_name");

-- CreateIndex
CREATE INDEX "movie_crew_movie_id_idx" ON "public"."movie_crew"("movie_id");

-- CreateIndex
CREATE INDEX "movie_crew_person_id_idx" ON "public"."movie_crew"("person_id");

-- CreateIndex
CREATE INDEX "movie_crew_role_id_idx" ON "public"."movie_crew"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "movie_crew_movie_id_person_id_role_id_key" ON "public"."movie_crew"("movie_id", "person_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "color_types_slug_key" ON "public"."color_types"("slug");

-- CreateIndex
CREATE INDEX "color_types_category_idx" ON "public"."color_types"("category");

-- CreateIndex
CREATE INDEX "color_types_slug_idx" ON "public"."color_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "public"."locations"("slug");

-- CreateIndex
CREATE INDEX "locations_parent_id_idx" ON "public"."locations"("parent_id");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "public"."locations"("name");

-- CreateIndex
CREATE INDEX "locations_slug_idx" ON "public"."locations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "themes_slug_key" ON "public"."themes"("slug");

-- CreateIndex
CREATE INDEX "themes_slug_idx" ON "public"."themes"("slug");

-- CreateIndex
CREATE INDEX "themes_name_idx" ON "public"."themes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "public"."roles"("slug");

-- CreateIndex
CREATE INDEX "roles_department_idx" ON "public"."roles"("department");

-- CreateIndex
CREATE INDEX "roles_is_active_idx" ON "public"."roles"("is_active");

-- CreateIndex
CREATE INDEX "roles_is_main_role_idx" ON "public"."roles"("is_main_role");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_department_key" ON "public"."roles"("name", "department");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_slug_key" ON "public"."ratings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_name_key" ON "public"."ratings"("name");

-- CreateIndex
CREATE INDEX "ratings_slug_idx" ON "public"."ratings"("slug");

-- CreateIndex
CREATE INDEX "ratings_order_idx" ON "public"."ratings"("order");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "public"."countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "public"."languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- AddForeignKey
ALTER TABLE "public"."movies" ADD CONSTRAINT "movies_color_type_id_fkey" FOREIGN KEY ("color_type_id") REFERENCES "public"."color_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movies" ADD CONSTRAINT "movies_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_screenings" ADD CONSTRAINT "movie_screenings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_screenings" ADD CONSTRAINT "movie_screenings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."screening_venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_alternative_titles" ADD CONSTRAINT "movie_alternative_titles_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_links" ADD CONSTRAINT "movie_links_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."people" ADD CONSTRAINT "people_birth_location_id_fkey" FOREIGN KEY ("birth_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."people" ADD CONSTRAINT "people_death_location_id_fkey" FOREIGN KEY ("death_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_nationalities" ADD CONSTRAINT "person_nationalities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_nationalities" ADD CONSTRAINT "person_nationalities_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_links" ADD CONSTRAINT "person_links_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_cast" ADD CONSTRAINT "movie_cast_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_cast" ADD CONSTRAINT "movie_cast_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_crew" ADD CONSTRAINT "movie_crew_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_crew" ADD CONSTRAINT "movie_crew_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_crew" ADD CONSTRAINT "movie_crew_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_genres" ADD CONSTRAINT "movie_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_genres" ADD CONSTRAINT "movie_genres_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_production_companies" ADD CONSTRAINT "movie_production_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."production_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_production_companies" ADD CONSTRAINT "movie_production_companies_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_distribution_companies" ADD CONSTRAINT "movie_distribution_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."distribution_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_distribution_companies" ADD CONSTRAINT "movie_distribution_companies_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_images" ADD CONSTRAINT "movie_images_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_videos" ADD CONSTRAINT "movie_videos_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_awards" ADD CONSTRAINT "movie_awards_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_awards" ADD CONSTRAINT "movie_awards_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_awards" ADD CONSTRAINT "movie_awards_recipient_person_id_fkey" FOREIGN KEY ("recipient_person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_themes" ADD CONSTRAINT "movie_themes_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_themes" ADD CONSTRAINT "movie_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_countries" ADD CONSTRAINT "movie_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_countries" ADD CONSTRAINT "movie_countries_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_ratings" ADD CONSTRAINT "user_ratings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_watchlist" ADD CONSTRAINT "user_watchlist_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_watched" ADD CONSTRAINT "user_watched_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_watched" ADD CONSTRAINT "user_watched_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

