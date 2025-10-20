# Dockerfile optimizado para gessa-boletos-mvp
FROM node:18-alpine

# Metadata
LABEL maintainer="Gessa Boletos MVP"
LABEL description="Sistema de gestión de boletos de comedor con QR y anti-fraude"

# Instalar dependencias del sistema necesarias para sqlite3 y canvas (para PDFs)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json primero (cache layer optimization)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production && npm cache clean --force

# Copiar el resto del código
COPY . .

# Crear directorios necesarios para volúmenes
RUN mkdir -p data escaneos comprobantes pdfs

# Exponer puerto 3000
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000

# Health check para Docker/Coolify
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Dar permisos al usuario node (necesario para archivos locales)
RUN chown -R node:node /app

# Usuario no-root por seguridad
USER node

# Comando de inicio
CMD ["npm", "start"]
