#!/bin/bash
# setup-tools-cron.sh
# Configura el cron job de backup de DB (3:00 AM)
#
# Nota: el scraper de Letterboxd corre desde la PC local vía
# Task Scheduler porque Cloudflare bloquea IPs de datacenter.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Configurando cron job de backup${NC}"
echo "========================================"

PROJECT_PATH="${PROJECT_PATH:-/var/www/cinenacional}"

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ No se encontró el proyecto en $PROJECT_PATH${NC}"
    exit 1
fi

COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.tools.yml"

mkdir -p "$PROJECT_PATH/logs"

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

# Configurar cron job
CRON_BACKUP="0 3 * * * $BACKUP_WRAPPER"

CURRENT_CRONTAB=$(crontab -l 2>/dev/null || true)

if echo "$CURRENT_CRONTAB" | grep -q "run-db-backup.sh"; then
    echo -e "${YELLOW}⚠️  Cron de backup ya existe${NC}"
else
    echo "$CURRENT_CRONTAB
$CRON_BACKUP" | crontab -
    echo -e "${GREEN}✅ Cron de backup configurado (3:00 AM)${NC}"
fi

echo ""
echo -e "${GREEN}📋 Configuración completada${NC}"
echo ""
echo "Ejecución manual:"
echo "  $COMPOSE_CMD run --rm db-backup"
echo ""
echo "Logs:"
echo "  tail -f $PROJECT_PATH/logs/db-backup-\$(date +%Y%m%d).log"
