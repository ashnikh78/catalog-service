# Dockerfile for User Service
FROM node:18-alpine

WORKDIR /app


# Install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --production

# Copy source code
COPY . .

EXPOSE 3011

# Healthcheck for Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3011/health || exit 1

CMD ["node", "src/index.js"]
