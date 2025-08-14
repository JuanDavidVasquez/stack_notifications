# =========================
# Etapa 1: Build
# =========================
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilación
RUN apk add --no-cache python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json tsconfig.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/
COPY environments/ ./environments/
COPY src/templates/ ./src/templates/

# Compilar TypeScript
RUN npm run build

# =========================
# Etapa 2: Producción
# =========================
FROM node:18-alpine AS production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S notifications -u 1001

WORKDIR /app

# Copiar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar compilado y otros recursos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/environments ./environments
COPY --from=builder /app/src/templates ./src/templates

# Crear directorios y ajustar permisos
RUN mkdir -p logs cert && \
    chown -R notifications:nodejs /app

# Cambiar a usuario no-root
USER notifications

# Exponer puerto
EXPOSE 4001

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=4001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["node", "dist/index.js"]
