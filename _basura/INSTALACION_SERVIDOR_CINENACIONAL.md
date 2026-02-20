# 🎬 Guía Completa de Instalación - CineNacional

## Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Configuración Inicial del VPS](#2-configuración-inicial-del-vps)
3. [Instalación de Dependencias](#3-instalación-de-dependencias)
4. [Configuración de Firewall](#4-configuración-de-firewall)
5. [Clonar el Repositorio](#5-clonar-el-repositorio)
6. [Configuración de Variables de Entorno](#6-configuración-de-variables-de-entorno)
7. [Restaurar Base de Datos](#7-restaurar-base-de-datos)
8. [Configuración de Nginx](#8-configuración-de-nginx)
9. [Configuración de SSL con Certbot](#9-configuración-de-ssl-con-certbot)
10. [Configuración de Cloudflare](#10-configuración-de-cloudflare)
11. [Configuración de Google Drive (rclone)](#11-configuración-de-google-drive-rclone)
12. [Scripts de Mantenimiento](#12-scripts-de-mantenimiento)
13. [Configuración de Cron Jobs](#13-configuración-de-cron-jobs)
14. [Configuración de GitHub Actions](#14-configuración-de-github-actions)
15. [Iniciar los Servicios](#15-iniciar-los-servicios)
16. [Verificación Post-Instalación](#16-verificación-post-instalación)
17. [Configuración del Bot de Telegram](#17-configuración-del-bot-de-telegram)
18. [Troubleshooting](#18-troubleshooting)
19. [Comandos Útiles](#19-comandos-útiles)
20. [Información de Referencia](#20-información-de-referencia)

---

## 1. Requisitos Previos

### Hardware Mínimo Recomendado
- **CPU**: 2 vCPUs
- **RAM**: 4 GB
- **Disco**: 40 GB SSD
- **SO**: Ubuntu 24.04 LTS

### Cuentas y Accesos Necesarios
- [ ] Acceso SSH al VPS (con clave SSH)
- [ ] Cuenta de GitHub con acceso al repositorio
- [ ] Cuenta de Cloudflare con dominio configurado
- [ ] Cuenta de Google Cloud (para backups a Drive)
- [ ] Cuenta de Cloudinary (para imágenes)
- [ ] Bot de Telegram creado (opcional, para notificaciones)

### Archivos Necesarios
- [ ] Dump de la base de datos (`full_backup.sql.gz`)
- [ ] Archivo de credenciales de Google Drive (`gdrive-service-account.json`)
- [ ] Clave SSH privada para GitHub Actions

---

## 2. Configuración Inicial del VPS

### 2.1 Conectarse al VPS
```bash
ssh root@TU_IP_DEL_VPS
```

### 2.2 Actualizar el sistema
```bash
apt update && apt upgrade -y
```

### 2.3 Configurar timezone
```bash
timedatectl set-timezone America/Argentina/Buenos_Aires
```

### 2.4 Crear estructura de directorios
```bash
mkdir -p /var/www/cinenacional
mkdir -p /var/www/cinenacional/backups
mkdir -p /var/www/cinenacional/logs
mkdir -p /var/www/cinenacional/public/uploads
```

---

## 3. Instalación de Dependencias

### 3.1 Instalar paquetes básicos
```bash
apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    bc \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common
```

### 3.2 Instalar Docker

```bash
# Agregar clave GPG oficial de Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Agregar repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalación
docker --version
docker compose version
```

### 3.3 Instalar Nginx
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3.4 Instalar Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 3.5 Instalar rclone (para backups a Google Drive)
```bash
curl https://rclone.org/install.sh | bash
```

---

## 4. Configuración de Firewall

### 4.1 Configurar UFW
```bash
# Habilitar UFW
ufw enable

# Permitir SSH (importante: hacer esto primero!)
ufw allow 22/tcp

# Permitir HTTP y HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Verificar estado
ufw status
```

**Resultado esperado:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

---

## 5. Clonar el Repositorio

### 5.1 Configurar Git (opcional pero recomendado)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 5.2 Clonar el repositorio
```bash
cd /var/www
git clone https://github.com/diegopapic/cinenacional.git
cd cinenacional
```

### 5.3 Verificar estructura
```bash
ls -la
# Deberías ver: docker-compose.yml, Dockerfile, prisma/, src/, etc.
```

---

## 6. Configuración de Variables de Entorno

### 6.1 Crear archivo .env para producción
```bash
nano /var/www/cinenacional/.env
```

**Contenido del archivo `.env`:**
```env
# Base de datos (conexión interna Docker)
DATABASE_URL="postgresql://cinenacional:(ver .env)@postgres:5432/cinenacional?schema=public&connection_limit=50&pool_timeout=10"
DIRECT_URL="postgresql://cinenacional:(ver .env)@postgres:5432/cinenacional?schema=public"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dzndglyjr
CLOUDINARY_API_KEY=916999397279161
CLOUDINARY_API_SECRET=6K7EQkELG4dgl4RgdA5wsTwSPpI

# Redis
REDIS_URL=redis://redis:6379

# Entorno
NODE_ENV=production

# Analytics
ANALYTICS_EXCLUDED_IPS=TU_IP_DE_CASA

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_WINDOW=60000

# Auth (generar nuevo secret con: openssl rand -base64 32)
NEXTAUTH_URL=https://cinenacional.com
NEXTAUTH_SECRET=GENERAR_NUEVO_SECRET_AQUI

# Admin inicial
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD=TU_PASSWORD_SEGURO
ADMIN_USERNAME=admin

# Ads (deshabilitados por defecto)
NEXT_PUBLIC_ADS_ENABLED=false
```

### 6.2 Generar NEXTAUTH_SECRET
```bash
openssl rand -base64 32
# Copiar el resultado y pegarlo en .env
```

---

## 7. Restaurar Base de Datos

### 7.1 Iniciar solo PostgreSQL primero
```bash
cd /var/www/cinenacional
docker compose up -d postgres
```

### 7.2 Esperar a que PostgreSQL esté listo
```bash
# Verificar que esté healthy
docker compose ps
# Esperar hasta que diga "healthy"

# También puedes verificar los logs
docker compose logs postgres
```

### 7.3 Copiar el dump al servidor
```bash
# Desde tu máquina local (si el dump está local):
scp full_backup.sql.gz root@TU_IP:/var/www/cinenacional/backups/

# O si está en Google Drive, descargarlo con rclone (después de configurar rclone):
rclone copy gdrive-sa:CARPETA_BACKUP/backup_FECHA/full_backup.sql.gz /var/www/cinenacional/backups/
```

### 7.4 Restaurar el dump
```bash
cd /var/www/cinenacional

# Descomprimir si está comprimido
gunzip -k backups/full_backup.sql.gz

# Restaurar (opción 1: desde archivo descomprimido)
docker compose exec -T postgres psql -U cinenacional -d cinenacional < backups/full_backup.sql

# Restaurar (opción 2: directamente desde .gz)
gunzip -c backups/full_backup.sql.gz | docker compose exec -T postgres psql -U cinenacional -d cinenacional
```

### 7.5 Verificar la restauración
```bash
# Conectarse a PostgreSQL
docker compose exec postgres psql -U cinenacional -d cinenacional

# Dentro de psql, verificar tablas:
\dt

# Contar películas:
SELECT COUNT(*) FROM movies;

# Salir:
\q
```

### 7.6 Corregir secuencias de auto-increment (IMPORTANTE)
Después de restaurar un dump, las secuencias de auto-increment pueden estar desincronizadas:

```bash
docker compose exec -T postgres psql -U cinenacional -d cinenacional << 'EOF'
SELECT setval('movies_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM genres));
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM roles));
SELECT setval('locations_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM locations));
SELECT setval('themes_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM themes));
SELECT setval('countries_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM countries));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM users));
SELECT setval('ratings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM ratings));
SELECT setval('color_types_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM color_types));
SELECT setval('screening_venues_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM screening_venues));
SELECT setval('production_companies_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM production_companies));
SELECT setval('distribution_companies_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM distribution_companies));
SELECT setval('awards_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM awards));
EOF
```

---

## 8. Configuración de Nginx

### 8.1 Crear configuración del sitio
```bash
nano /etc/nginx/sites-available/cinenacional
```

**Contenido:**
```nginx
# Configuración para cinenacional.com
server {
    listen 80;
    listen [::]:80;
    server_name TU_IP cinenacional.com www.cinenacional.com;

    # Límite de tamaño para uploads
    client_max_body_size 10M;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy hacia la app Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optimización para archivos estáticos de Next.js
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Optimización para imágenes
    location /images {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Archivos públicos
    location /favicon.ico {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
    }

    location /robots.txt {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 1d;
        access_log off;
    }

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/rss+xml
        application/atom+xml
        image/svg+xml;

    # Logs específicos para el sitio
    access_log /var/log/nginx/cinenacional_access.log;
    error_log /var/log/nginx/cinenacional_error.log;
}
```

### 8.2 Habilitar el sitio
```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/cinenacional /etc/nginx/sites-enabled/

# Eliminar configuración por defecto (opcional)
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx
```

---

## 9. Configuración de SSL con Certbot

### 9.1 Obtener certificado SSL
```bash
certbot --nginx -d cinenacional.com -d www.cinenacional.com
```

Seguir las instrucciones:
- Ingresar email para notificaciones
- Aceptar términos de servicio
- Elegir si redirigir HTTP a HTTPS (recomendado: sí)

### 9.2 Verificar renovación automática
```bash
# Probar renovación
certbot renew --dry-run

# Verificar timer de systemd
systemctl status certbot.timer
```

### 9.3 Verificar certificados
```bash
certbot certificates
```

---

## 10. Configuración de Cloudflare

### 10.1 Configuración DNS

En el panel de Cloudflare, configurar los siguientes registros DNS:

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | @ | TU_IP_VPS | ✅ Proxied |
| A | www | TU_IP_VPS | ✅ Proxied |
| A | staging | TU_IP_VPS | ✅ Proxied |
| A | uptime | TU_IP_VPS | ✅ Proxied |

### 10.2 Configuración SSL/TLS

1. Ir a **SSL/TLS → Overview**
2. Seleccionar modo: **Flexible**
   - (Usa "Full" si tenés certificados válidos en el servidor)

### 10.3 Configuración de Page Rules (opcional)

Crear regla para forzar HTTPS:
- URL: `*cinenacional.com/*`
- Setting: Always Use HTTPS

---

## 11. Configuración de Google Drive (rclone)

### 11.1 Crear Service Account en Google Cloud

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. Habilitar Google Drive API
4. Ir a **IAM & Admin → Service Accounts**
5. Crear Service Account
6. Crear clave JSON y descargarla

### 11.2 Subir archivo de credenciales al servidor
```bash
# Desde tu máquina local
scp gdrive-service-account.json root@TU_IP:/root/
```

### 11.3 Configurar rclone
```bash
mkdir -p /root/.config/rclone
nano /root/.config/rclone/rclone.conf
```

**Contenido:**
```ini
[gdrive-sa]
type = drive
scope = drive
service_account_file = /root/gdrive-service-account.json
team_drive = TU_TEAM_DRIVE_ID
```

> **Nota:** Si no usas Team Drive, omite la línea `team_drive`.

### 11.4 Compartir carpeta con Service Account

1. En Google Drive, crear carpeta para backups
2. Compartir la carpeta con el email del Service Account
   - El email está en el archivo JSON: `client_email`
3. Dar permisos de "Editor"

### 11.5 Verificar conexión
```bash
# Listar contenido de Drive
rclone lsd gdrive-sa:

# Probar subida
echo "test" > /tmp/test.txt
rclone copy /tmp/test.txt gdrive-sa:test/
rclone ls gdrive-sa:test/
```

---

## 12. Scripts de Mantenimiento

### 12.1 Script de Backup de Base de Datos

```bash
nano /root/backup-database.sh
```

**Contenido:**
```bash
#!/bin/bash

# =============================================================================
# Script de Backup - CineNacional
# =============================================================================

BACKUP_DIR="/var/www/cinenacional/backups"
PROJECT_DIR="/var/www/cinenacional"
DB_NAME="cinenacional"
DB_USER="cinenacional"
GDRIVE_REMOTE="gdrive-sa"
GDRIVE_FOLDER=""
LOCAL_RETENTION_DAYS=7
GDRIVE_RETENTION_DAYS=30

# Telegram (opcional - dejar vacío para desactivar)
TELEGRAM_BOT_TOKEN="TU_BOT_TOKEN"
TELEGRAM_CHAT_ID="TU_CHAT_ID"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_HUMAN=$(date +"%d/%m/%Y %H:%M:%S")
BACKUP_FOLDER="backup_${TIMESTAMP}"

# Función para enviar mensaje a Telegram
send_telegram() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="${message}" \
            -d parse_mode="HTML" > /dev/null 2>&1
    fi
}

# Función para formatear tamaños
format_size() {
    local size=$1
    if [ -z "$size" ] || [ "$size" -eq 0 ] 2>/dev/null; then
        echo "0 bytes"
        return
    fi
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

echo "=========================================="
echo "Backup iniciado: ${DATE_HUMAN}"
echo "=========================================="

# Crear directorios
CURRENT_BACKUP_DIR="${BACKUP_DIR}/${BACKUP_FOLDER}"
TABLES_DIR="${CURRENT_BACKUP_DIR}/tables"
mkdir -p "${TABLES_DIR}"

cd "${PROJECT_DIR}"

# 1. Backup del schema
echo ""
echo "1. Creando backup del schema..."
docker compose exec -T postgres pg_dump -U "${DB_USER}" --schema-only "${DB_NAME}" 2>/dev/null | gzip > "${CURRENT_BACKUP_DIR}/schema.sql.gz"
SCHEMA_SIZE=$(stat -c%s "${CURRENT_BACKUP_DIR}/schema.sql.gz" 2>/dev/null || echo 0)
echo "   OK schema.sql.gz ($(format_size ${SCHEMA_SIZE}))"

# 2. Backup completo
echo ""
echo "2. Creando backup completo..."
docker compose exec -T postgres pg_dump -U "${DB_USER}" "${DB_NAME}" 2>/dev/null | gzip > "${CURRENT_BACKUP_DIR}/full_backup.sql.gz"
FULL_SIZE=$(stat -c%s "${CURRENT_BACKUP_DIR}/full_backup.sql.gz" 2>/dev/null || echo 0)
echo "   OK full_backup.sql.gz ($(format_size ${FULL_SIZE}))"

# 3. Backup por tablas
echo ""
echo "3. Creando backups por tabla..."
TABLE_COUNT=0

TABLES=$(docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null)

for TABLE in $TABLES; do
    TABLE=$(echo "$TABLE" | tr -d '[:space:]')
    if [ -z "$TABLE" ]; then
        continue
    fi

    docker compose exec -T postgres pg_dump -U "${DB_USER}" --data-only -t "$TABLE" "${DB_NAME}" 2>/dev/null | gzip > "${TABLES_DIR}/${TABLE}.sql.gz"

    FILE_SIZE=$(stat -c%s "${TABLES_DIR}/${TABLE}.sql.gz" 2>/dev/null || echo 0)
    if [ "$FILE_SIZE" -gt 50 ]; then
        echo "   OK ${TABLE}.sql.gz ($(format_size ${FILE_SIZE}))"
        TABLE_COUNT=$((TABLE_COUNT + 1))
    else
        rm -f "${TABLES_DIR}/${TABLE}.sql.gz"
        echo "   - ${TABLE} (vacía)"
    fi
done

TOTAL_SIZE=$(du -sb "${CURRENT_BACKUP_DIR}" 2>/dev/null | cut -f1 || echo 0)
TABLES_SIZE=$(du -sb "${TABLES_DIR}" 2>/dev/null | cut -f1 || echo 0)

echo ""
echo "Resumen de backup:"
echo "  - Schema: $(format_size ${SCHEMA_SIZE})"
echo "  - Full backup: $(format_size ${FULL_SIZE})"
echo "  - Tablas: ${TABLE_COUNT} archivos ($(format_size ${TABLES_SIZE}))"
echo "  - Total: $(format_size ${TOTAL_SIZE})"

# 4. Subir a Google Drive
echo ""
echo "4. Subiendo a Google Drive..."
if rclone copy "${CURRENT_BACKUP_DIR}" "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${BACKUP_FOLDER}/" 2>/dev/null; then
    echo "   OK Backup subido exitosamente"
    GDRIVE_STATUS="✅ OK"
else
    echo "   ERROR al subir a Google Drive"
    GDRIVE_STATUS="❌ Error"
fi

# 5. Limpieza de backups antiguos
echo ""
echo "5. Limpiando backups antiguos..."
DELETED_LOCAL=0
CUTOFF_LOCAL=$(date -d "-${LOCAL_RETENTION_DAYS} days" +%Y%m%d)

for dir in "${BACKUP_DIR}"/backup_*; do
    if [ -d "$dir" ]; then
        DIR_NAME=$(basename "$dir")
        DIR_DATE=$(echo "$DIR_NAME" | sed 's/backup_//' | cut -d'_' -f1)
        if [ "$DIR_DATE" -lt "$CUTOFF_LOCAL" ] 2>/dev/null; then
            rm -rf "$dir"
            DELETED_LOCAL=$((DELETED_LOCAL + 1))
            echo "   Eliminado local: ${DIR_NAME}"
        fi
    fi
done

DELETED_GDRIVE=0
CUTOFF_GDRIVE=$(date -d "-${GDRIVE_RETENTION_DAYS} days" +%Y%m%d)
GDRIVE_DIRS=$(rclone lsd "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | awk '{print $NF}' | grep "^backup_" || true)

for dir in ${GDRIVE_DIRS}; do
    DIR_DATE=$(echo "$dir" | sed 's/backup_//' | cut -d'_' -f1)
    if [ -n "$DIR_DATE" ] && [ "$DIR_DATE" -lt "$CUTOFF_GDRIVE" ] 2>/dev/null; then
        if rclone purge "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${dir}" 2>/dev/null; then
            DELETED_GDRIVE=$((DELETED_GDRIVE + 1))
            echo "   Eliminado Drive: ${dir}"
        fi
    fi
done

echo "   Eliminados: ${DELETED_LOCAL} locales, ${DELETED_GDRIVE} en Drive"

LOCAL_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" 2>/dev/null | wc -l)
GDRIVE_COUNT=$(rclone lsd "${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/" 2>/dev/null | grep -c "backup_" || echo 0)

# Enviar notificación a Telegram
SUCCESS_MSG="🎬 Backup CineNacional ✅

📅 Fecha: ${DATE_HUMAN}
📁 Carpeta: ${BACKUP_FOLDER}

📊 Contenido:
• Schema: $(format_size ${SCHEMA_SIZE})
• Full: $(format_size ${FULL_SIZE})
• Tablas: ${TABLE_COUNT} archivos
• Total: $(format_size ${TOTAL_SIZE})

☁️ Drive: ${GDRIVE_STATUS}

💾 Almacenados:
• Local: ${LOCAL_COUNT} (${LOCAL_RETENTION_DAYS} días)
• Drive: ${GDRIVE_COUNT} (${GDRIVE_RETENTION_DAYS} días)"

send_telegram "${SUCCESS_MSG}"

echo ""
echo "=========================================="
echo "Backup completado exitosamente"
echo "=========================================="
```

```bash
# Dar permisos de ejecución
chmod +x /root/backup-database.sh
```

### 12.2 Script de Actualización de Estadísticas

```bash
nano /root/update_movie_stats.sql
```

**Contenido:**
```sql
-- Actualizar estadísticas de películas basadas en page_views
INSERT INTO movie_stats (movie_id, views_week, views_month, views_year, views_total, updated_at)
SELECT
  pv.movie_id,
  COUNT(*) FILTER (WHERE pv.created_at > CURRENT_DATE - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE pv.created_at > CURRENT_DATE - INTERVAL '30 days'),
  COUNT(*) FILTER (WHERE pv.created_at > CURRENT_DATE - INTERVAL '365 days'),
  COUNT(*),
  NOW()
FROM page_views pv
WHERE pv.page_type = 'MOVIE' AND pv.movie_id IS NOT NULL
GROUP BY pv.movie_id
ON CONFLICT (movie_id) DO UPDATE SET
  views_week = EXCLUDED.views_week,
  views_month = EXCLUDED.views_month,
  views_year = EXCLUDED.views_year,
  views_total = EXCLUDED.views_total,
  updated_at = NOW();
```

---

## 13. Configuración de Cron Jobs

### 13.1 Editar crontab
```bash
crontab -e
```

### 13.2 Agregar las siguientes tareas
```cron
# =============================================================================
# Cron Jobs - CineNacional
# =============================================================================

# Limpieza de Docker todos los lunes a las 2 AM
0 2 * * 1 docker system prune -a -f && docker builder prune -a -f >> /var/log/docker-cleanup.log 2>&1

# Backup diario a las 5 AM
0 5 * * * /bin/bash /root/backup-database.sh >> /var/www/cinenacional/backups/backup.log 2>&1

# Actualiza estadísticas cada hora
0 * * * * cd /var/www/cinenacional && docker compose exec -T postgres psql -U cinenacional -d cinenacional < /root/update_movie_stats.sql >> /root/movie_stats.log 2>&1

# Detector TMDB diario a las 6 AM (opcional)
0 6 * * * cd /var/www/cinenacional && docker compose -f docker-compose.yml -f docker-compose.tmdb.yml run --rm tmdb-detector >> /var/www/cinenacional/logs/tmdb-detector.log 2>&1

# Renovación de certificados SSL (Certbot ya configura esto, pero por si acaso)
0 3 * * * certbot renew --quiet
```

### 13.3 Verificar crontab
```bash
crontab -l
```

---

## 14. Configuración de GitHub Actions

### 14.1 Crear clave SSH para deployment

**En el servidor:**
```bash
# Generar par de claves
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/github_deploy_key -N ""

# Agregar clave pública a authorized_keys
cat /root/.ssh/github_deploy_key.pub >> /root/.ssh/authorized_keys

# Mostrar clave privada (la necesitarás para GitHub)
cat /root/.ssh/github_deploy_key
```

### 14.2 Configurar Secrets en GitHub

1. Ir a **GitHub → Tu Repositorio → Settings → Secrets and variables → Actions**
2. Agregar los siguientes secrets:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | `TU_IP_DEL_VPS` (ej: 5.161.58.106) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contenido de `/root/.ssh/github_deploy_key` (clave privada completa) |
| `VPS_PATH` | `/var/www/cinenacional` |
| `DATABASE_URL` | `postgresql://cinenacional:(ver .env)@postgres:5432/cinenacional` |
| `PAT_TOKEN` | Token de acceso personal de GitHub (opcional, para acceso a repos privados) |

### 14.3 Crear workflow de deployment

El archivo ya debería existir en el repositorio: `.github/workflows/deploy-production.yml`

**Contenido de referencia:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to Production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd ${{ secrets.VPS_PATH }}
          
          echo "🚀 Starting production deployment..."
          
          git fetch origin main
          git checkout main
          git reset --hard origin/main
          
          # Rebuild y restart Docker
          docker compose down
          docker compose build --no-cache app
          docker compose up -d
          
          # Esperar que inicie
          echo "⏳ Waiting for services to start..."
          sleep 30
          
          # Verificar que está corriendo
          docker compose ps
          
          echo "✅ Production deployment completed"
          echo "🌐 Production URL: https://cinenacional.com"
```

---

## 15. Iniciar los Servicios

### 15.1 Construir e iniciar todos los servicios
```bash
cd /var/www/cinenacional

# Construir imágenes
docker compose build

# Iniciar servicios en background
docker compose up -d
```

### 15.2 Verificar que todo está corriendo
```bash
# Ver estado de containers
docker compose ps

# Resultado esperado:
# NAME                    STATUS
# cinenacional-db         Up (healthy)
# cinenacional-redis      Up (healthy)
# cinenacional-app        Up (healthy)
# cinenacional-uptime     Up
```

### 15.3 Ver logs
```bash
# Todos los servicios
docker compose logs -f

# Solo la app
docker compose logs -f app

# Solo PostgreSQL
docker compose logs -f postgres
```

---

## 16. Verificación Post-Instalación

### 16.1 Checklist de verificación

```bash
# 1. Verificar containers
docker compose ps

# 2. Verificar que la app responde
curl -I http://localhost:3000

# 3. Verificar Nginx
curl -I http://localhost

# 4. Verificar SSL (desde afuera)
curl -I https://cinenacional.com

# 5. Verificar base de datos
docker compose exec postgres psql -U cinenacional -d cinenacional -c "SELECT COUNT(*) FROM movies;"

# 6. Verificar Redis
docker compose exec redis redis-cli ping
# Respuesta esperada: PONG

# 7. Verificar endpoint de health
curl http://localhost:3000/api/health
```

### 16.2 Probar funcionalidades críticas

1. **Acceder al sitio**: https://cinenacional.com
2. **Buscar una película**: Verificar que funciona la búsqueda
3. **Ver una película**: Verificar que carga correctamente
4. **Panel de admin**: https://cinenacional.com/admin (si existe)
5. **Uptime Kuma**: http://TU_IP:3001

### 16.3 Ejecutar backup manual
```bash
/root/backup-database.sh
# Verificar que llegue notificación a Telegram
```

---

## 17. Configuración del Bot de Telegram

### 17.1 Crear Bot de Telegram

1. Hablar con [@BotFather](https://t.me/BotFather) en Telegram
2. Enviar `/newbot`
3. Seguir instrucciones para nombrar el bot
4. Guardar el **token** que te da

### 17.2 Obtener tu Chat ID

1. Hablar con [@userinfobot](https://t.me/userinfobot)
2. Te mostrará tu Chat ID (un número)

### 17.3 Configurar el bot en los scripts

Editar `/root/backup-database.sh`:
```bash
TELEGRAM_BOT_TOKEN="TU_BOT_TOKEN_AQUI"
TELEGRAM_CHAT_ID="TU_CHAT_ID_AQUI"
```

### 17.4 Iniciar el Bot de Telegram (TMDB)

Si querés usar el bot interactivo de Telegram para TMDB:

```bash
cd /var/www/cinenacional

# Crear archivo de variables para TMDB
nano .env.tmdb
```

**Contenido de `.env.tmdb`:**
```env
TMDB_ACCESS_TOKEN=TU_TOKEN_DE_TMDB
TELEGRAM_BOT_TOKEN=TU_BOT_TOKEN
TELEGRAM_CHAT_ID=TU_CHAT_ID
ANTHROPIC_API_KEY=TU_API_KEY_DE_ANTHROPIC
```

```bash
# Iniciar bot de Telegram
docker compose -f docker-compose.yml -f docker-compose.tmdb.yml up -d telegram-bot
```

---

## 18. Troubleshooting

### Problema: La app no inicia

```bash
# Ver logs detallados
docker compose logs app

# Errores comunes:
# - DATABASE_URL incorrecto
# - Puerto 3000 ya en uso
# - Falta de memoria
```

### Problema: Error de conexión a PostgreSQL

```bash
# Verificar que postgres está corriendo
docker compose ps postgres

# Ver logs de postgres
docker compose logs postgres

# Verificar conectividad
docker compose exec app ping postgres
```

### Problema: Nginx no conecta con la app

```bash
# Verificar que la app responde en localhost
curl http://127.0.0.1:3000

# Verificar configuración de nginx
nginx -t

# Ver logs de nginx
tail -f /var/log/nginx/cinenacional_error.log
```

### Problema: SSL no funciona

```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew

# Verificar configuración de Cloudflare
# - SSL/TLS debe estar en "Flexible" o "Full"
```

### Problema: Backup falla

```bash
# Ejecutar backup manualmente para ver errores
/root/backup-database.sh

# Verificar conexión a Google Drive
rclone ls gdrive-sa:

# Verificar permisos del script
ls -la /root/backup-database.sh
```

### Problema: Deployment de GitHub Actions falla

1. Verificar que los secrets estén configurados correctamente
2. Probar conexión SSH manual:
```bash
ssh -i /path/to/key root@TU_IP
```
3. Ver logs en GitHub Actions

### Problema: Out of Memory

```bash
# Ver uso de memoria
free -h
docker stats

# Ajustar límites en docker-compose.yml
# Reducir memory limits si es necesario
```

---

## 19. Comandos Útiles

### Docker

```bash
# Ver estado de containers
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Reiniciar un servicio
docker compose restart app

# Rebuild y reiniciar
docker compose down && docker compose build --no-cache && docker compose up -d

# Entrar a un container
docker compose exec app sh
docker compose exec postgres psql -U cinenacional -d cinenacional

# Ver uso de recursos
docker stats

# Limpiar Docker (cuidado!)
docker system prune -a -f
```

### Base de datos

```bash
# Conectarse a PostgreSQL
docker compose exec postgres psql -U cinenacional -d cinenacional

# Backup manual
docker compose exec -T postgres pg_dump -U cinenacional cinenacional > backup.sql

# Restore
docker compose exec -T postgres psql -U cinenacional -d cinenacional < backup.sql

# Ver tamaño de tablas
docker compose exec postgres psql -U cinenacional -d cinenacional -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;"
```

### Nginx

```bash
# Verificar configuración
nginx -t

# Recargar configuración
systemctl reload nginx

# Ver logs
tail -f /var/log/nginx/cinenacional_access.log
tail -f /var/log/nginx/cinenacional_error.log
```

### Sistema

```bash
# Ver uso de disco
df -h

# Ver uso de memoria
free -h

# Ver procesos
htop

# Ver logs del sistema
journalctl -f
```

---

## 20. Información de Referencia

### Puertos utilizados

| Puerto | Servicio | Acceso |
|--------|----------|--------|
| 22 | SSH | Público |
| 80 | HTTP (Nginx) | Público |
| 443 | HTTPS (Nginx) | Público |
| 3000 | Next.js App | Solo localhost |
| 3001 | Uptime Kuma | Público |
| 5432 | PostgreSQL | Solo localhost |
| 6379 | Redis | Solo localhost |

### Rutas importantes

| Ruta | Descripción |
|------|-------------|
| `/var/www/cinenacional` | Directorio del proyecto |
| `/var/www/cinenacional/backups` | Backups de base de datos |
| `/var/www/cinenacional/logs` | Logs de la aplicación |
| `/var/www/cinenacional/public/uploads` | Archivos subidos |
| `/root/backup-database.sh` | Script de backup |
| `/root/update_movie_stats.sql` | Script de estadísticas |
| `/root/.config/rclone/rclone.conf` | Configuración de rclone |
| `/etc/nginx/sites-available/cinenacional` | Configuración de Nginx |
| `/etc/letsencrypt/live/cinenacional.com/` | Certificados SSL |

### Credenciales (actualizar según tu instalación)

| Servicio | Usuario | Password |
|----------|---------|----------|
| PostgreSQL | cinenacional | (ver .env) |
| Admin Web | admin | (definido en .env) |

### URLs

| URL | Descripción |
|-----|-------------|
| https://cinenacional.com | Sitio principal |
| https://staging.cinenacional.com | Ambiente de staging |
| http://TU_IP:3001 | Uptime Kuma |

### Contactos y recursos

| Recurso | URL/Info |
|---------|----------|
| Repositorio | https://github.com/diegopapic/cinenacional |
| Cloudinary | https://cloudinary.com/console |
| Cloudflare | https://dash.cloudflare.com |
| Google Cloud | https://console.cloud.google.com |
| Telegram Bot | @BotFather |

---

## Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-01 | 1.0 | Documentación inicial |

---

**Documento creado para CineNacional**  
**Última actualización:** Enero 2025
