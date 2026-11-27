FROM node:22-alpine

# Instalar git, tar y curl para clonación, descarga de tarball y sincronización del acervo legislativo
RUN apk add --no-cache git tar curl

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Copiar explícitamente el acervo preempaquetado fuera del volumen persistente /app/data
COPY bundled/acervo /app/bundled/acervo

# EXPOSE debe coincidir con PORT (el dominio en Dokploy usa este puerto)
EXPOSE 4000

CMD ["node", "server/server.js"]

