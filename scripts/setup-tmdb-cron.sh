#!/bin/bash
# setup-tmdb-cron.sh
# Script para configurar el cron job del detector de películas TMDB

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🎬 Configurando TMDB Daily Detector${NC}"
echo "========================================"

# Ruta del proyecto
PROJECT_PATH="${PROJECT_PATH:-/root/cinenacional}"

# Verificar que existe el proyecto
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ No se encontró el proyecto en $PROJECT_PATH${NC}"
    exit 1
fi

# Crear el script wrapper
WRAPPER_SCRIPT="$PROJECT_PATH/scripts/run-tmdb-detector.sh"

cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
PROJECT_PATH="/root/cinenacional"
LOG_FILE="$PROJECT_PATH/logs/tmdb-detector-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_PATH/logs"

echo "========================================" >> "$LOG_FILE"
echo "🎬 TMDB Detector - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

cd "$PROJECT_PATH"

docker compose -f docker-compose.yml -f docker-compose.tmdb.yml run --rm tmdb-detector >> "$LOG_FILE" 2>&1

find "$PROJECT_PATH/logs" -name "tmdb-detector-*.log" -mtime +7 -delete

echo "✨ Completado: $(date)" >> "$LOG_FILE"
EOF

chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}✅ Script wrapper creado: $WRAPPER_SCRIPT${NC}"

mkdir -p "$PROJECT_PATH/logs"

# Configurar cron job (6:00 AM diario)
CRON_JOB="0 6 * * * $WRAPPER_SCRIPT"

if crontab -l 2>/dev/null | grep -q "run-tmdb-detector.sh"; then
    echo -e "${YELLOW}⚠️ Ya existe un cron job para tmdb-detector${NC}"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✅ Cron job configurado para las 6:00 AM${NC}"
fi

echo ""
echo -e "${GREEN}📋 Configuración completada${NC}"
echo ""
echo "Para ejecutar manualmente:"
echo "  $WRAPPER_SCRIPT"
echo ""
echo "Para ver logs:"
echo "  tail -f $PROJECT_PATH/logs/tmdb-detector-\$(date +%Y%m%d).log"