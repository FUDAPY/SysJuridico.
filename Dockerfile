FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Dokploy inyecta PORT y DATABASE_URL como variables de entorno en runtime
EXPOSE 4000

CMD ["node", "server/server.js"]
