-- Drop tmdb popularity fields
ALTER TABLE "movies" DROP COLUMN IF EXISTS "tmdb_popularity";
ALTER TABLE "movies" DROP COLUMN IF EXISTS "tmdb_vote_count";
ALTER TABLE "movies" DROP COLUMN IF EXISTS "tmdb_popularity_updated_at";

-- Add imdb votes fields
ALTER TABLE "movies" ADD COLUMN "imdb_votes" INTEGER;
ALTER TABLE "movies" ADD COLUMN "imdb_votes_updated_at" TIMESTAMPTZ;
