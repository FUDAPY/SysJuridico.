# Node 22 LTS (node:20 quedó EOL)
FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# EXPOSE debe coincidir con PORT (el dominio en Dokploy usa este puerto)
EXPOSE 4000

CMD ["node", "server/server.js"]
