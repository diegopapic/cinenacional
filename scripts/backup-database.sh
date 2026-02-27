#!/bin/bash

# =============================================================================
# CineNacional - Script de Backup Automático v3
# =============================================================================
# Realiza:
#   1. Backup del schema (estructura sin datos)
#   2. Backup completo (todo junto)
#   3. Backup por tabla (solo datos)
# Mantiene 7 días locales y 30 días en Google Drive
# Envía notificaciones a Telegram
#
# Funciona tanto en el host como dentro de un container Docker.
# Dentro del container se conecta directo a postgres vía red Docker.
# =============================================================================

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cinenacional}"
DB_USER="${DB_USER:-cinenacional}"
GDRIVE_REMOTE="gdrive-backups"
GDRIVE_FOLDER="cinenacional-backups"
LOCAL_RETENTION_DAYS=7
GDRIVE_RETENTION_DAYS=30

# Telegram (pueden venir de env vars)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_HUMAN=$(date +"%d/%m/%Y %H:%M:%S")
BACKUP_FOLDER="backup_${TIMESTAMP}"

# Export para que pg_dump/psql no pidan password
export PGPASSWORD="${POSTGRES_PASSWORD}"

# ── Funciones ─────────────────────────────────────────────────────────

send_telegram() {
    local message="$1"
    if [ -z "${TELEGRAM_BOT_TOKEN}" ] || [ -z "${TELEGRAM_CHAT_ID}" ]; then
        return 0
    fi
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="HTML" > /dev/null 2>&1 || true
}

format_size() {
    local size=$1
    if [ $size -ge 1073741824 ]; then
        echo "$(echo "scale=2; $size/1073741824" | bc) GB"
    elif [ $size -ge 1048576 ]; then
        echo "$(echo "scale=2; $size/1048576" | bc) MB"
    elif [ $size -ge 1024 ]; then
        echo "$(echo "scale=2; $size/1024" | bc) KB"
    else
        echo "$size bytes"
    fi
}

get_dir_size() {
    local dir=$1
    du -sb "$dir" 2>/dev/null | cut -f1
}

# ── Inicio ────────────────────────────────────────────────────────────

echo "=========================================="
echo "Backup iniciado: ${DATE_HUMAN}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "=========================================="

# Crear directorios
CURRENT_BACKUP_DIR="${BACKUP_DIR}/${BACKUP_FOLDER}"
TABLES_DIR="${CURRENT_BACKUP_DIR}/tables"
mkdir -p "${TABLES_DIR}"

# Verificar conexión a PostgreSQL
if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -q 2>/dev/null; then
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 No se puede conectar a PostgreSQL en ${DB_HOST}:${DB_PORT}"
    send_telegram "${ERROR_MSG}"
    echo "Error: No se puede conectar a PostgreSQL"
    exit 1
fi

# =============================================================================
# 1. BACKUP DEL SCHEMA (estructura sin datos)
# =============================================================================
echo ""
echo "1. Creando backup del schema..."
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" --schema-only "${DB_NAME}" > "${CURRENT_BACKUP_DIR}/schema.sql" 2>/dev/null; then
    gzip "${CURRENT_BACKUP_DIR}/schema.sql"
    SCHEMA_SIZE=$(stat -c%s "${CURRENT_BACKUP_DIR}/schema.sql.gz")
    echo "   ✓ schema.sql.gz ($(format_size ${SCHEMA_SIZE}))"
else
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 Error al crear backup del schema"
    send_telegram "${ERROR_MSG}"
    rm -rf "${CURRENT_BACKUP_DIR}"
    exit 1
fi

# =============================================================================
# 2. BACKUP COMPLETO (todo junto)
# =============================================================================
echo ""
echo "2. Creando backup completo..."
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" > "${CURRENT_BACKUP_DIR}/full_backup.sql" 2>/dev/null; then
    gzip "${CURRENT_BACKUP_DIR}/full_backup.sql"
    FULL_SIZE=$(stat -c%s "${CURRENT_BACKUP_DIR}/full_backup.sql.gz")
    echo "   ✓ full_backup.sql.gz ($(format_size ${FULL_SIZE}))"
else
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 Error al crear backup completo"
    send_telegram "${ERROR_MSG}"
    rm -rf "${CURRENT_BACKUP_DIR}"
    exit 1
fi

# =============================================================================
# 3. BACKUP POR TABLA (solo datos)
# =============================================================================
echo ""
echo "3. Creando backups por tabla..."

TABLES=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | tr -d ' ' | grep -v '^$')

TABLE_COUNT=0
TABLE_ERRORS=0

for TABLE in ${TABLES}; do
    if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" --data-only -t "${TABLE}" "${DB_NAME}" > "${TABLES_DIR}/${TABLE}.sql" 2>/dev/null; then
        if [ -s "${TABLES_DIR}/${TABLE}.sql" ]; then
            gzip "${TABLES_DIR}/${TABLE}.sql"
            TABLE_SIZE=$(stat -c%s "${TABLES_DIR}/${TABLE}.sql.gz")
            echo "   ✓ ${TABLE}.sql.gz ($(format_size ${TABLE_SIZE}))"
            ((TABLE_COUNT++))
        else
            rm -f "${TABLES_DIR}/${TABLE}.sql"
            echo "   - ${TABLE} (vacía, omitida)"
        fi
    else
        echo "   ✗ ${TABLE} (error)"
        ((TABLE_ERRORS++))
        rm -f "${TABLES_DIR}/${TABLE}.sql"
    fi
done

# Calcular tamaño total
TOTAL_SIZE=$(get_dir_size "${CURRENT_BACKUP_DIR}")
TABLES_SIZE=$(get_dir_size "${TABLES_DIR}")

echo ""
echo "Resumen de backup:"
echo "  - Schema: $(format_size ${SCHEMA_SIZE})"
echo "  - Full backup: $(format_size ${FULL_SIZE})"
echo "  - Tablas: ${TABLE_COUNT} archivos ($(format_size ${TABLES_SIZE}))"
echo "  - Total: $(format_size ${TOTAL_SIZE})"

# =============================================================================
# 4. SUBIR A GOOGLE DRIVE
# =============================================================================
echo ""
echo "4. Subiendo a Google Drive..."
if command -v rclone &>/dev/null && rclone copy "${CURRENT_BACKUP_DIR}" "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${BACKUP_FOLDER}/" 2>/dev/null; then
    echo "   ✓ Backup subido exitosamente"
    GDRIVE_STATUS="✅ Subido"
else
    echo "   ✗ Error al subir a Google Drive (o rclone no configurado)"
    GDRIVE_STATUS="⚠️ Error al subir"
fi

# =============================================================================
# 5. LIMPIEZA DE BACKUPS ANTIGUOS
# =============================================================================
echo ""
echo "5. Limpiando backups antiguos..."

# Limpiar backups locales (más de 7 días)
DELETED_LOCAL=0
for dir in "${BACKUP_DIR}"/backup_*; do
    if [ -d "$dir" ]; then
        DIR_DATE=$(basename "$dir" | sed 's/backup_//' | cut -d'_' -f1)
        DIR_TIMESTAMP=$(date -d "${DIR_DATE:0:4}-${DIR_DATE:4:2}-${DIR_DATE:6:2}" +%s 2>/dev/null || echo 0)
        CUTOFF_TIMESTAMP=$(date -d "-${LOCAL_RETENTION_DAYS} days" +%s)
        if [ "$DIR_TIMESTAMP" -lt "$CUTOFF_TIMESTAMP" ] && [ "$DIR_TIMESTAMP" -ne 0 ]; then
            rm -rf "$dir"
            ((DELETED_LOCAL++))
            echo "   Eliminado local: $(basename $dir)"
        fi
    fi
done

# Limpiar backups antiguos en Google Drive (más de 30 días)
DELETED_GDRIVE=0
if command -v rclone &>/dev/null; then
    CUTOFF_DATE=$(date -d "-${GDRIVE_RETENTION_DAYS} days" +"%Y%m%d")
    GDRIVE_DIRS=$(rclone lsd "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | awk '{print $NF}' | grep "^backup_" || true)

    for dir in ${GDRIVE_DIRS}; do
        DIR_DATE=$(echo "$dir" | sed 's/backup_//' | cut -d'_' -f1)
        if [ "$DIR_DATE" -lt "$CUTOFF_DATE" ] 2>/dev/null; then
            rclone purge "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${dir}" 2>/dev/null && ((DELETED_GDRIVE++))
            echo "   Eliminado Drive: ${dir}"
        fi
    done
fi

echo "   Eliminados: ${DELETED_LOCAL} locales, ${DELETED_GDRIVE} en Drive"

# =============================================================================
# 6. CONTAR BACKUPS ACTUALES
# =============================================================================
LOCAL_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" | wc -l)
GDRIVE_COUNT=0
if command -v rclone &>/dev/null; then
    GDRIVE_COUNT=$(rclone lsd "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | grep "backup_" | wc -l)
fi

# =============================================================================
# 7. ENVIAR NOTIFICACIÓN
# =============================================================================
SUCCESS_MSG="✅ <b>Backup CineNacional Exitoso</b>

📅 ${DATE_HUMAN}
📁 Carpeta: <code>${BACKUP_FOLDER}</code>

📊 <b>Contenido:</b>
- Schema: $(format_size ${SCHEMA_SIZE})
- Full backup: $(format_size ${FULL_SIZE})
- Tablas: ${TABLE_COUNT} archivos ($(format_size ${TABLES_SIZE}))
- Total: $(format_size ${TOTAL_SIZE})

☁️ Google Drive: ${GDRIVE_STATUS}

🗂️ <b>Backups almacenados:</b>
- Local (7 días): ${LOCAL_COUNT}
- Drive (30 días): ${GDRIVE_COUNT}

🗑️ <b>Limpieza:</b>
- Eliminados local: ${DELETED_LOCAL}
- Eliminados Drive: ${DELETED_GDRIVE}"

if [ ${TABLE_ERRORS} -gt 0 ]; then
    SUCCESS_MSG="${SUCCESS_MSG}

⚠️ <b>Advertencia:</b> ${TABLE_ERRORS} tablas con errores"
fi

send_telegram "${SUCCESS_MSG}"

echo ""
echo "=========================================="
echo "Backup completado exitosamente"
echo "=========================================="
