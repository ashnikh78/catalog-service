
# Build stage
FROM node:18 AS builder
WORKDIR /app

# Install build dependencies for sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for testing)
RUN npm ci --ignore-scripts

# Rebuild sqlite3 for the container's platform
RUN npm rebuild sqlite3 --build-from-source

# Copy source code
COPY . .

# Run tests
RUN npm run test:ci

# Production stage
FROM node:18-slim
WORKDIR /app
RUN useradd -m appuser
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
RUN npm ci --production --ignore-scripts
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3011/health || exit 1
RUN echo "if [ -z \$DB_HOST ] || [ -z \$DB_NAME ] || [ -z \$DB_USER ] || [ -z \$DB_PASS ]; then echo 'Missing required environment variables'; exit 1; fi" > /app/check_env.sh
CMD ["/bin/sh", "-c", ". /app/check_env.sh && npm start"]
