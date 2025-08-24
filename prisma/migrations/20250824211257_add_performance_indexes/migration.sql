-- CreateIndex
CREATE INDEX "movie_crew_movie_id_role_id_idx" ON "public"."movie_crew"("movie_id", "role_id");

-- CreateIndex
CREATE INDEX "movies_release_year_release_month_release_day_idx" ON "public"."movies"("release_year", "release_month", "release_day");

-- CreateIndex
CREATE INDEX "movies_created_at_idx" ON "public"."movies"("created_at");

-- CreateIndex
CREATE INDEX "people_created_at_idx" ON "public"."people"("created_at");
