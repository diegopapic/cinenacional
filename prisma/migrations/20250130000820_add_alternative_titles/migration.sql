-- CreateTable
CREATE TABLE "movie_alternative_titles" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_alternative_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movie_alternative_titles_movie_id_idx" ON "movie_alternative_titles"("movie_id");

-- CreateIndex
CREATE INDEX "movie_alternative_titles_title_idx" ON "movie_alternative_titles"("title");

-- AddForeignKey
ALTER TABLE "movie_alternative_titles" ADD CONSTRAINT "movie_alternative_titles_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;