-- Add popularity and premiere info columns to tmdb_pending_movies
ALTER TABLE "tmdb_pending_movies" ADD COLUMN "tmdb_popularity" DOUBLE PRECISION;
ALTER TABLE "tmdb_pending_movies" ADD COLUMN "tmdb_premiere_info" VARCHAR(500);
