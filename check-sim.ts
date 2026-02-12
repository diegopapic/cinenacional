import { stringSimilarity } from './scripts/tmdb/utils';
const local = 'Black is Beltza 2: Ainhoa';
const tmdb = 'Black Is Beltza II: Ainhoa';
console.log('Similitud:', stringSimilarity(local, tmdb) + '%');
