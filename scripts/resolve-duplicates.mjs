#!/usr/bin/env node

/**
 * Script interactivo para resolver duplicados de personas en películas homónimas.
 *
 * Recorre los casos donde una misma persona aparece en cast/crew de dos películas
 * con el mismo título (distinto año) y permite elegir en cuál quedarse.
 *
 * Uso: node scripts/resolve-duplicates.mjs
 */

import pg from "pg";
import * as readline from "readline";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Cargar variables de entorno
for (const envFile of [".env.local", ".env"]) {
  const p = resolve(root, envFile);
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  console.error(
    "Error: No se encontró DATABASE_URL ni DIRECT_URL en las variables de entorno."
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const QUERY = `
SELECT
    m1.id        AS movie1_id,
    m1.title,
    m1.year      AS movie1_year,
    m2.id        AS movie2_id,
    m2.year      AS movie2_year,
    pe.id        AS person_id,
    pe.first_name,
    pe.last_name,
    STRING_AGG(DISTINCT p.source, ', ') AS source
FROM movies m1
JOIN movies m2
    ON m1.title = m2.title
    AND m1.id < m2.id
JOIN (
    SELECT movie_id, person_id, 'cast' AS source FROM movie_cast
    UNION ALL
    SELECT movie_id, person_id, 'crew' AS source FROM movie_crew
) p ON p.movie_id IN (m1.id, m2.id)
JOIN people pe ON pe.id = p.person_id
GROUP BY m1.id, m1.title, m1.year, m2.id, m2.year, pe.id, pe.first_name, pe.last_name
HAVING COUNT(DISTINCT p.movie_id) = 2
ORDER BY m1.title, m1.id, m2.id;
`;

// Colores ANSI
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";

function sourceLabel(source) {
  if (source.includes("cast") && source.includes("crew")) return `${MAGENTA}cast + crew${RESET}`;
  if (source.includes("cast")) return `${CYAN}cast${RESET}`;
  return `${YELLOW}crew${RESET}`;
}

async function deleteFromMovie(client, movieId, personId, source) {
  const deleted = [];

  if (source.includes("cast")) {
    const res = await client.query(
      "DELETE FROM movie_cast WHERE movie_id = $1 AND person_id = $2",
      [movieId, personId]
    );
    if (res.rowCount > 0) deleted.push(`${res.rowCount} fila(s) de cast`);
  }

  if (source.includes("crew")) {
    const res = await client.query(
      "DELETE FROM movie_crew WHERE movie_id = $1 AND person_id = $2",
      [movieId, personId]
    );
    if (res.rowCount > 0) deleted.push(`${res.rowCount} fila(s) de crew`);
  }

  return deleted;
}

async function main() {
  console.log(`\n${BOLD}=== Resolver duplicados en películas homónimas ===${RESET}\n`);
  console.log(`${DIM}Conectando a la base de datos...${RESET}`);

  const client = await pool.connect();

  try {
    console.log(`${DIM}Ejecutando query de duplicados...${RESET}\n`);
    const { rows } = await client.query(QUERY);

    if (rows.length === 0) {
      console.log(`${GREEN}No se encontraron duplicados.${RESET}`);
      return;
    }

    console.log(`${BOLD}Se encontraron ${rows.length} casos de duplicados.${RESET}\n`);

    const stats = {
      keepMovie1: 0,
      keepMovie2: 0,
      keepBoth: 0,
      deleteFromBoth: 0,
      skipped: 0,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const personName = [row.first_name, row.last_name].filter(Boolean).join(" ") || "(sin nombre)";

      console.log(`${DIM}─────────────────────────────────────────────────────${RESET}`);
      console.log(
        `${BOLD}[${i + 1}/${rows.length}]${RESET} ${BOLD}${row.title}${RESET}`
      );
      console.log(
        `  Película 1: ${CYAN}${row.title} (${row.movie1_year || "s/a"})${RESET} ${DIM}[ID ${row.movie1_id}]${RESET}`
      );
      console.log(
        `  Película 2: ${CYAN}${row.title} (${row.movie2_year || "s/a"})${RESET} ${DIM}[ID ${row.movie2_id}]${RESET}`
      );
      console.log(`  Persona:    ${YELLOW}${personName}${RESET} ${DIM}[ID ${row.person_id}]${RESET}`);
      console.log(`  Aparece en: ${sourceLabel(row.source)}`);
      console.log();
      console.log(`  ${BOLD}1${RESET} → Quedarse en película 1 (${row.movie1_year || "s/a"}) — borrar de película 2`);
      console.log(`  ${BOLD}2${RESET} → Quedarse en película 2 (${row.movie2_year || "s/a"}) — borrar de película 1`);
      console.log(`  ${BOLD}3${RESET} → Quedarse en ambas — no hacer nada`);
      console.log(`  ${BOLD}4${RESET} → Borrar de ambas películas`);
      console.log(`  ${BOLD}5${RESET} → Saltar`);
      console.log(`  ${BOLD}q${RESET} → Salir\n`);

      let choice = "";
      while (!["1", "2", "3", "4", "5", "q"].includes(choice)) {
        choice = (await ask(`  Opción: `)).trim().toLowerCase();
      }

      if (choice === "q") {
        console.log(`\n${YELLOW}Abortando...${RESET}\n`);
        break;
      }

      if (choice === "1") {
        // Borrar de película 2
        const deleted = await deleteFromMovie(client, row.movie2_id, row.person_id, row.source);
        console.log(
          `  ${GREEN}✓ Borrado de película 2 (${row.movie2_year || "s/a"}): ${deleted.join(", ")}${RESET}`
        );
        stats.keepMovie1++;
      } else if (choice === "2") {
        // Borrar de película 1
        const deleted = await deleteFromMovie(client, row.movie1_id, row.person_id, row.source);
        console.log(
          `  ${GREEN}✓ Borrado de película 1 (${row.movie1_year || "s/a"}): ${deleted.join(", ")}${RESET}`
        );
        stats.keepMovie2++;
      } else if (choice === "3") {
        console.log(`  ${DIM}→ Se mantiene en ambas.${RESET}`);
        stats.keepBoth++;
      } else if (choice === "4") {
        // Borrar de ambas películas
        const deleted1 = await deleteFromMovie(client, row.movie1_id, row.person_id, row.source);
        const deleted2 = await deleteFromMovie(client, row.movie2_id, row.person_id, row.source);
        console.log(
          `  ${RED}✓ Borrado de película 1 (${row.movie1_year || "s/a"}): ${deleted1.join(", ")}${RESET}`
        );
        console.log(
          `  ${RED}✓ Borrado de película 2 (${row.movie2_year || "s/a"}): ${deleted2.join(", ")}${RESET}`
        );
        stats.deleteFromBoth++;
      } else if (choice === "5") {
        console.log(`  ${DIM}→ Saltado.${RESET}`);
        stats.skipped++;
      }

      console.log();
    }

    // Resumen final
    const total = stats.keepMovie1 + stats.keepMovie2 + stats.keepBoth + stats.deleteFromBoth + stats.skipped;
    console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}                    RESUMEN${RESET}`);
    console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
    console.log(`  Total procesados:       ${total} / ${rows.length}`);
    console.log(`  ${GREEN}Quedó en película 1:    ${stats.keepMovie1}${RESET}`);
    console.log(`  ${GREEN}Quedó en película 2:    ${stats.keepMovie2}${RESET}`);
    console.log(`  Quedó en ambas:         ${stats.keepBoth}`);
    console.log(`  ${RED}Borrado de ambas:       ${stats.deleteFromBoth}${RESET}`);
    console.log(`  Saltados:               ${stats.skipped}`);
    console.log(
      `  ${RED}Filas eliminadas (aprox): ${stats.keepMovie1 + stats.keepMovie2 + stats.deleteFromBoth * 2} acciones de borrado${RESET}`
    );
    console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}\n`);
  } finally {
    client.release();
    await pool.end();
    rl.close();
  }
}

main().catch((err) => {
  console.error(`${RED}Error fatal:${RESET}`, err);
  process.exit(1);
});
