FROM node:18-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# AGREGAR ESTAS LÍNEAS ANTES DEL BUILD
# Recibir la variable como argumento de build
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
# Establecerla como variable de entorno para el build
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

# Build de Next.js (ahora tendrá acceso a la variable)
RUN npm run build

# Exponer puerto
EXPOSE 3000

ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Iniciar la aplicación
CMD ["npm", "start"]