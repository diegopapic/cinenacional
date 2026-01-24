-- Add tmdb_popularity and tmdb_popularity_updated_at to movies and people tables
ALTER TABLE "movies" ADD COLUMN "tmdb_popularity" DOUBLE PRECISION;
ALTER TABLE "movies" ADD COLUMN "tmdb_popularity_updated_at" TIMESTAMPTZ;

ALTER TABLE "people" ADD COLUMN "tmdb_popularity" DOUBLE PRECISION;
ALTER TABLE "people" ADD COLUMN "tmdb_popularity_updated_at" TIMESTAMPTZ;
