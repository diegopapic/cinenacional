@echo off
cd /d C:\Users\diego\cinenacional
npx tsx scripts/letterboxd/update-popularity-daily.ts >> logs\letterboxd-updater.log 2>&1
