#!/bin/bash
# setup-tools-cron.sh
# Configura los cron jobs para las herramientas de mantenimiento:
#   - Backup de DB (3:00 AM)
#   - Actualización de popularidad desde Letterboxd (4:00 AM)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Configurando cron jobs de mantenimiento${NC}"
echo "========================================"

PROJECT_PATH="${PROJECT_PATH:-/root/cinenacional}"

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ No se encontró el proyecto en $PROJECT_PATH${NC}"
    exit 1
fi

COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.tools.yml"

mkdir -p "$PROJECT_PATH/logs"

# ── 1. Backup de DB ──────────────────────────────────────────────────

BACKUP_WRAPPER="$PROJECT_PATH/scripts/run-db-backup.sh"

cat > "$BACKUP_WRAPPER" << EOF
#!/bin/bash
PROJECT_PATH="$PROJECT_PATH"
LOG_FILE="\$PROJECT_PATH/logs/db-backup-\$(date +%Y%m%d).log"

mkdir -p "\$PROJECT_PATH/logs"

echo "========================================" >> "\$LOG_FILE"
echo "💾 DB Backup - \$(date)" >> "\$LOG_FILE"
echo "========================================" >> "\$LOG_FILE"

cd "\$PROJECT_PATH"
$COMPOSE_CMD run --rm db-backup >> "\$LOG_FILE" 2>&1

find "\$PROJECT_PATH/logs" -name "db-backup-*.log" -mtime +7 -delete

echo "✨ Completado: \$(date)" >> "\$LOG_FILE"
EOF

chmod +x "$BACKUP_WRAPPER"
echo -e "${GREEN}✅ Wrapper de backup creado: $BACKUP_WRAPPER${NC}"

# ── 2. Letterboxd Popularity Updater ─────────────────────────────────

LB_WRAPPER="$PROJECT_PATH/scripts/run-letterboxd-updater.sh"

cat > "$LB_WRAPPER" << EOF
#!/bin/bash
PROJECT_PATH="$PROJECT_PATH"
LOG_FILE="\$PROJECT_PATH/logs/letterboxd-updater-\$(date +%Y%m%d).log"

mkdir -p "\$PROJECT_PATH/logs"

echo "========================================" >> "\$LOG_FILE"
echo "📊 Letterboxd Updater - \$(date)" >> "\$LOG_FILE"
echo "========================================" >> "\$LOG_FILE"

cd "\$PROJECT_PATH"
$COMPOSE_CMD run --rm letterboxd-updater >> "\$LOG_FILE" 2>&1

find "\$PROJECT_PATH/logs" -name "letterboxd-updater-*.log" -mtime +7 -delete

echo "✨ Completado: \$(date)" >> "\$LOG_FILE"
EOF

chmod +x "$LB_WRAPPER"
echo -e "${GREEN}✅ Wrapper de letterboxd creado: $LB_WRAPPER${NC}"

# ── 3. Configurar cron jobs ──────────────────────────────────────────

CRON_BACKUP="0 3 * * * $BACKUP_WRAPPER"
CRON_LETTERBOXD="0 4 * * * $LB_WRAPPER"

CRON_UPDATED=false

CURRENT_CRONTAB=$(crontab -l 2>/dev/null || true)

if echo "$CURRENT_CRONTAB" | grep -q "run-db-backup.sh"; then
    echo -e "${YELLOW}⚠️  Cron de backup ya existe${NC}"
else
    CURRENT_CRONTAB="$CURRENT_CRONTAB
$CRON_BACKUP"
    CRON_UPDATED=true
    echo -e "${GREEN}✅ Cron de backup configurado (3:00 AM)${NC}"
fi

if echo "$CURRENT_CRONTAB" | grep -q "run-letterboxd-updater.sh"; then
    echo -e "${YELLOW}⚠️  Cron de letterboxd ya existe${NC}"
else
    CURRENT_CRONTAB="$CURRENT_CRONTAB
$CRON_LETTERBOXD"
    CRON_UPDATED=true
    echo -e "${GREEN}✅ Cron de letterboxd configurado (4:00 AM)${NC}"
fi

if [ "$CRON_UPDATED" = true ]; then
    echo "$CURRENT_CRONTAB" | crontab -
fi

echo ""
echo -e "${GREEN}📋 Configuración completada${NC}"
echo ""
echo "Ejecución manual:"
echo "  $COMPOSE_CMD run --rm db-backup"
echo "  $COMPOSE_CMD run --rm letterboxd-updater"
echo ""
echo "Logs:"
echo "  tail -f $PROJECT_PATH/logs/db-backup-\$(date +%Y%m%d).log"
echo "  tail -f $PROJECT_PATH/logs/letterboxd-updater-\$(date +%Y%m%d).log"
