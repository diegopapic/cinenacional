#!/bin/bash
# setup-letterboxd-cron.sh
# Configura el cron job para actualización diaria de popularidad desde Letterboxd

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📊 Configurando Letterboxd Daily Popularity Updater${NC}"
echo "========================================"

PROJECT_PATH="${PROJECT_PATH:-/root/cinenacional}"

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ No se encontró el proyecto en $PROJECT_PATH${NC}"
    exit 1
fi

# Crear el script wrapper
WRAPPER_SCRIPT="$PROJECT_PATH/scripts/run-letterboxd-updater.sh"

cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
PROJECT_PATH="/root/cinenacional"
LOG_FILE="$PROJECT_PATH/logs/letterboxd-updater-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_PATH/logs"

echo "========================================" >> "$LOG_FILE"
echo "📊 Letterboxd Popularity Updater - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

cd "$PROJECT_PATH"

docker compose -f docker-compose.yml -f docker-compose.letterboxd.yml run --rm letterboxd-updater >> "$LOG_FILE" 2>&1

find "$PROJECT_PATH/logs" -name "letterboxd-updater-*.log" -mtime +7 -delete

echo "✨ Completado: $(date)" >> "$LOG_FILE"
EOF

chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}✅ Script wrapper creado: $WRAPPER_SCRIPT${NC}"

mkdir -p "$PROJECT_PATH/logs"

# Configurar cron job (4:00 AM diario)
CRON_JOB="0 4 * * * $WRAPPER_SCRIPT"

if crontab -l 2>/dev/null | grep -q "run-letterboxd-updater.sh"; then
    echo -e "${YELLOW}⚠️ Ya existe un cron job para letterboxd-updater${NC}"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✅ Cron job configurado para las 4:00 AM${NC}"
fi

echo ""
echo -e "${GREEN}📋 Configuración completada${NC}"
echo ""
echo "Para ejecutar manualmente:"
echo "  docker compose -f docker-compose.yml -f docker-compose.letterboxd.yml run --rm letterboxd-updater"
echo ""
echo "Para ver logs:"
echo "  tail -f $PROJECT_PATH/logs/letterboxd-updater-\$(date +%Y%m%d).log"
