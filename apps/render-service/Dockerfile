FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    fonts-liberation \
    fonts-montserrat \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

