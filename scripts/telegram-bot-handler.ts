/**
 * Telegram Bot Handler
 *
 * Servicio que hace polling a Telegram para recibir las respuestas de los botones
 * y procesar las acciones correspondientes (asignar tmdb_id o importar películas).
 *
 * Uso:
 *   npx tsx scripts/telegram-bot-handler.ts          # Ejecutar en modo continuo
 *   npx tsx scripts/telegram-bot-handler.ts --once   # Ejecutar una sola vez
 */

import {
    // Tipos
    type TMDBMovieDetails,

    // API
    getMovieDetails,

    // Base de datos
    getPool,
    closePool,
    movieExistsByTmdbId,

    // Nombres
    loadFirstNameGenderCache,

    // Importer (usa la lógica completa compartida)
    importMovie,
} from './tmdb/lib';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const config = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    pollingInterval: 5000,  // 5 segundos entre polls
};

// ============================================================================
// TIPOS
// ============================================================================

interface TelegramUpdate {
    update_id: number;
    callback_query?: {
        id: string;
        from: { id: number };
        message?: {
            message_id: number;
            chat: { id: number };
        };
        data?: string;
    };
}

interface PendingMovie {
    id: number;
    tmdb_id: number;
    tmdb_title: string;
    tmdb_original_title: string | null;
    tmdb_year: number | null;
    tmdb_overview: string | null;
    tmdb_runtime: number | null;
    tmdb_director_name: string | null;
    tmdb_director_id: number | null;
    local_movie_id: number | null;
    local_movie_title: string | null;
    local_movie_year: number | null;
    action_type: string;
    match_score: number | null;
    telegram_message_id: number | null;
}

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

let lastUpdateId = 0;

// ============================================================================
// FUNCIONES DE TELEGRAM
// ============================================================================

async function getUpdates(): Promise<TelegramUpdate[]> {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
        );

        if (!response.ok) {
            console.log(`⚠️ Error en getUpdates: ${response.status}`);
            return [];
        }

        const data = await response.json();
        return data.result || [];
    } catch (error) {
        console.log(`⚠️ Error en getUpdates: ${error}`);
        return [];
    }
}

async function answerCallbackQuery(callbackId: string, text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/answerCallbackQuery`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: callbackId,
                    text,
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en answerCallbackQuery: ${error}`);
    }
}

async function editMessageText(chatId: number, messageId: number, text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/editMessageText`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text,
                    parse_mode: 'HTML',
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en editMessageText: ${error}`);
    }
}

async function sendMessage(text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegramChatId,
                    text,
                    parse_mode: 'HTML',
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en sendMessage: ${error}`);
    }
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

async function getPendingMovie(tmdbId: number): Promise<PendingMovie | null> {
    const pool = getPool();
    const result = await pool.query(
        "SELECT * FROM tmdb_pending_movies WHERE tmdb_id = $1 AND status = 'pending'",
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function updatePendingStatus(tmdbId: number, status: string): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE tmdb_pending_movies SET status = $1, processed_at = NOW() WHERE tmdb_id = $2',
        [status, tmdbId]
    );
}

async function assignTmdbIdToMovie(localMovieId: number, tmdbId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE movies SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
        [tmdbId, localMovieId]
    );
}

// ============================================================================
// FUNCIÓN DE IMPORTACIÓN
// ============================================================================

async function importMovieFromTmdb(tmdbId: number): Promise<{ success: boolean; movieId?: number; error?: string }> {
    try {
        // Verificar que no exista
        const existingId = await movieExistsByTmdbId(tmdbId);
        if (existingId) {
            return { success: false, error: 'La película ya existe en la base de datos' };
        }

        console.log(`📥 Importando película TMDB ID ${tmdbId}...`);

        // Obtener detalles de TMDB
        const movie = await getMovieDetails(tmdbId);

        // Usar la función importMovie del módulo compartido
        const result = await importMovie(movie);

        if (result.status === 'success') {
            return { success: true, movieId: result.movie_id };
        } else {
            return { success: false, error: result.message };
        }

    } catch (error) {
        console.error(`❌ Error importando película:`, error);
        return { success: false, error: String(error) };
    }
}

// ============================================================================
// HANDLERS DE ACCIONES
// ============================================================================

async function handleConfirmMatch(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }

    if (!pending.local_movie_id) {
        await editMessageText(chatId, messageId, '❌ No hay película local asociada para hacer match');
        return;
    }

    await assignTmdbIdToMovie(pending.local_movie_id, tmdbId);
    await updatePendingStatus(tmdbId, 'confirmed');

    await editMessageText(chatId, messageId,
        `✅ <b>Match confirmado</b>\n\n` +
        `Se asignó TMDB ID ${tmdbId} a:\n` +
        `<b>${pending.local_movie_title}</b> (${pending.local_movie_year || 'sin año'})`
    );

    console.log(`✅ Match confirmado: TMDB ${tmdbId} -> Local ${pending.local_movie_id}`);
}

async function handleRejectMatch(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }

    // Cambiar a "no_match" para que pueda decidir si importar
    const pool = getPool();
    await pool.query(
        "UPDATE tmdb_pending_movies SET action_type = 'no_match', local_movie_id = NULL WHERE tmdb_id = $1",
        [tmdbId]
    );

    // Enviar nuevo mensaje preguntando si importar
    await editMessageText(chatId, messageId,
        `❌ <b>Match rechazado</b>\n\n` +
        `<b>${pending.tmdb_title}</b> (${pending.tmdb_year || 'sin año'})\n\n` +
        `¿Querés importar esta película como nueva?`
    );

    // Enviar botones de importar
    await fetch(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `📥 <b>¿Importar "${pending.tmdb_title}"?</b>`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Importar película', callback_data: `import_new:${tmdbId}` }],
                        [{ text: '❌ No importar', callback_data: `reject_import:${tmdbId}` }],
                    ],
                },
            }),
        }
    );

    console.log(`❌ Match rechazado para TMDB ${tmdbId}`);
}

async function handleImportNew(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }

    await editMessageText(chatId, messageId,
        `⏳ <b>Importando...</b>\n\n` +
        `${pending.tmdb_title} (${pending.tmdb_year || 'sin año'})`
    );

    const result = await importMovieFromTmdb(tmdbId);

    if (result.success) {
        await updatePendingStatus(tmdbId, 'imported');
        await editMessageText(chatId, messageId,
            `✅ <b>Película importada</b>\n\n` +
            `<b>${pending.tmdb_title}</b> (${pending.tmdb_year || 'sin año'})\n\n` +
            `ID en CineNacional: ${result.movieId}\n` +
            `🔗 <a href="https://cinenacional.com/admin/movies?id=${result.movieId}">Ver en admin</a>`
        );
        console.log(`✅ Película importada: TMDB ${tmdbId} -> Local ${result.movieId}`);
    } else {
        await editMessageText(chatId, messageId,
            `❌ <b>Error al importar</b>\n\n` +
            `${pending.tmdb_title}\n\n` +
            `Error: ${result.error}`
        );
        console.log(`❌ Error importando TMDB ${tmdbId}: ${result.error}`);
    }
}

async function handleRejectImport(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }

    await updatePendingStatus(tmdbId, 'rejected');

    await editMessageText(chatId, messageId,
        `🚫 <b>Importación descartada</b>\n\n` +
        `${pending.tmdb_title} (${pending.tmdb_year || 'sin año'})`
    );

    console.log(`🚫 Importación rechazada para TMDB ${tmdbId}`);
}

// ============================================================================
// PROCESAMIENTO DE CALLBACKS
// ============================================================================

async function processCallback(update: TelegramUpdate): Promise<void> {
    const callback = update.callback_query;
    if (!callback?.data || !callback.message) return;

    const [action, tmdbIdStr] = callback.data.split(':');
    const tmdbId = parseInt(tmdbIdStr);

    if (isNaN(tmdbId)) {
        await answerCallbackQuery(callback.id, '❌ ID inválido');
        return;
    }

    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;

    console.log(`\n📩 Callback recibido: ${action} para TMDB ${tmdbId}`);

    await answerCallbackQuery(callback.id, '⏳ Procesando...');

    switch (action) {
        case 'confirm_match':
            await handleConfirmMatch(tmdbId, chatId, messageId);
            break;
        case 'reject_match':
            await handleRejectMatch(tmdbId, chatId, messageId);
            break;
        case 'import_new':
            await handleImportNew(tmdbId, chatId, messageId);
            break;
        case 'reject_import':
            await handleRejectImport(tmdbId, chatId, messageId);
            break;
        default:
            console.log(`⚠️ Acción desconocida: ${action}`);
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

async function main(): Promise<void> {
    console.log('🤖 Telegram Bot Handler v2.0');
    console.log('============================\n');

    const args = process.argv.slice(2);
    const runOnce = args.includes('--once');

    // Cargar cache de nombres
    await loadFirstNameGenderCache();

    if (runOnce) {
        console.log('🔄 Ejecutando una sola vez...\n');
    } else {
        console.log('🔄 Iniciando polling continuo...\n');
        console.log(`   Intervalo: ${config.pollingInterval}ms`);
        console.log('   Presiona Ctrl+C para detener\n');
    }

    const poll = async () => {
        try {
            const updates = await getUpdates();

            for (const update of updates) {
                lastUpdateId = Math.max(lastUpdateId, update.update_id);

                if (update.callback_query) {
                    await processCallback(update);
                }
            }
        } catch (error) {
            console.log(`⚠️ Error en polling: ${error}`);
        }
    };

    if (runOnce) {
        await poll();
    } else {
        // Polling continuo
        while (true) {
            await poll();
            await new Promise(resolve => setTimeout(resolve, config.pollingInterval));
        }
    }

    await closePool();
    console.log('\n✨ Bot detenido\n');
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Recibido SIGINT, cerrando...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Recibido SIGTERM, cerrando...');
    await closePool();
    process.exit(0);
});

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});
