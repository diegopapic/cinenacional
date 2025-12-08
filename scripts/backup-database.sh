cat > /var/www/cinenacional/scripts/backup-database.sh << 'EOF'
#!/bin/bash

# =============================================================================
# CineNacional - Script de Backup Automático
# =============================================================================
# Realiza backup de PostgreSQL, mantiene 7 días locales y 30 días en Google Drive
# Envía notificaciones a Telegram
# =============================================================================

set -e

# Configuración
BACKUP_DIR="/var/www/cinenacional/backups"
PROJECT_DIR="/var/www/cinenacional"
DB_CONTAINER="cinenacional-db"
DB_NAME="cinenacional"
DB_USER="cinenacional"
GDRIVE_REMOTE="gdrive-backups"
GDRIVE_FOLDER="cinenacional-backups"
LOCAL_RETENTION_DAYS=7
GDRIVE_RETENTION_DAYS=30

# Telegram
TELEGRAM_BOT_TOKEN="7690309153:AAEa3LZ1o-f5NayeOHwtjyuQ1BfY6LRj6s0"
TELEGRAM_CHAT_ID="1414789486"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_HUMAN=$(date +"%d/%m/%Y %H:%M:%S")
BACKUP_FILE="cinenacional_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Función para enviar mensaje a Telegram
send_telegram() {
    local message="$1"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="HTML" > /dev/null 2>&1
}

# Función para formatear tamaño de archivo
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

# Inicio
echo "=========================================="
echo "Backup iniciado: ${DATE_HUMAN}"
echo "=========================================="

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Verificar que el container de PostgreSQL está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 El container ${DB_CONTAINER} no está corriendo"
    send_telegram "${ERROR_MSG}"
    echo "Error: Container ${DB_CONTAINER} no está corriendo"
    exit 1
fi

# Realizar backup
echo "Realizando backup de la base de datos..."
cd "${PROJECT_DIR}"

if docker compose exec -T postgres pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null; then
    echo "Backup SQL creado exitosamente"
else
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 Error al ejecutar pg_dump"
    send_telegram "${ERROR_MSG}"
    echo "Error: Falló pg_dump"
    exit 1
fi

# Verificar que el archivo no está vacío
if [ ! -s "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    ERROR_MSG="❌ <b>Error en Backup CineNacional</b>

📅 ${DATE_HUMAN}
🔴 El archivo de backup está vacío"
    send_telegram "${ERROR_MSG}"
    rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "Error: Backup vacío"
    exit 1
fi

# Comprimir backup
echo "Comprimiendo backup..."
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Obtener tamaño del archivo comprimido
BACKUP_SIZE=$(stat -c%s "${BACKUP_DIR}/${BACKUP_FILE_GZ}")
BACKUP_SIZE_HUMAN=$(format_size ${BACKUP_SIZE})

echo "Backup comprimido: ${BACKUP_FILE_GZ} (${BACKUP_SIZE_HUMAN})"

# Subir a Google Drive
echo "Subiendo a Google Drive..."
if rclone copy "${BACKUP_DIR}/${BACKUP_FILE_GZ}" "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null; then
    echo "Backup subido a Google Drive exitosamente"
    GDRIVE_STATUS="✅ Subido"
else
    echo "Advertencia: No se pudo subir a Google Drive"
    GDRIVE_STATUS="⚠️ Error al subir"
fi

# Limpiar backups locales antiguos (más de 7 días)
echo "Limpiando backups locales antiguos..."
DELETED_LOCAL=$(find "${BACKUP_DIR}" -name "cinenacional_backup_*.sql.gz" -type f -mtime +${LOCAL_RETENTION_DAYS} -delete -print | wc -l)
echo "Eliminados ${DELETED_LOCAL} backups locales antiguos"

# Limpiar backups en Google Drive (más de 30 días)
echo "Limpiando backups antiguos en Google Drive..."
CUTOFF_DATE=$(date -d "-${GDRIVE_RETENTION_DAYS} days" +"%Y-%m-%d")
DELETED_GDRIVE=0

# Listar archivos en Drive y eliminar los antiguos
while IFS= read -r line; do
    if [ -n "$line" ]; then
        FILE_DATE=$(echo "$line" | awk '{print $2}')
        FILE_NAME=$(echo "$line" | awk '{print $NF}')
        if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
            rclone delete "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${FILE_NAME}" 2>/dev/null && ((DELETED_GDRIVE++))
        fi
    fi
done < <(rclone lsl "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | grep "cinenacional_backup_")

echo "Eliminados ${DELETED_GDRIVE} backups de Google Drive"

# Contar backups actuales
LOCAL_COUNT=$(find "${BACKUP_DIR}" -name "cinenacional_backup_*.sql.gz" -type f | wc -l)
GDRIVE_COUNT=$(rclone ls "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | grep "cinenacional_backup_" | wc -l)

# Enviar notificación de éxito
SUCCESS_MSG="✅ <b>Backup CineNacional Exitoso</b>

📅 ${DATE_HUMAN}
📦 Archivo: <code>${BACKUP_FILE_GZ}</code>
📊 Tamaño: ${BACKUP_SIZE_HUMAN}

☁️ Google Drive: ${GDRIVE_STATUS}

🗂️ <b>Backups almacenados:</b>
- Local (7 días): ${LOCAL_COUNT} archivos
- Drive (30 días): ${GDRIVE_COUNT} archivos

🗑️ <b>Limpieza:</b>
- Eliminados local: ${DELETED_LOCAL}
- Eliminados Drive: ${DELETED_GDRIVE}"

send_telegram "${SUCCESS_MSG}"

echo "=========================================="
echo "Backup completado exitosamente"
echo "=========================================="
EOF