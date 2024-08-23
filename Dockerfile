# Basis-Image
FROM node:20-alpine

# Arbeitsverzeichnis im Container
WORKDIR /usr/src/app

# Kopieren der package.json und package-lock.json (falls vorhanden)
COPY package*.json ./

# Installieren der Abhängigkeiten
RUN npm ci --only=production

# Kopieren des Quellcodes
COPY . .

# Port freigeben
EXPOSE 54322

# Umgebungsvariablen setzen (können beim Containerstart überschrieben werden)
ENV NODE_ENV=production

# Startbefehl
CMD ["node", "server.js"]
