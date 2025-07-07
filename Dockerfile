# Build stage
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run test

# Production stage
FROM node:18-slim
WORKDIR /app
RUN useradd -m appuser
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
RUN npm install --production
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3011/health || exit 1
RUN echo "if [ -z \$DB_HOST ] || [ -z \$DB_NAME ] || [ -z \$DB_USER ] || [ -z \$DB_PASS ]; then echo 'Missing required environment variables'; exit 1; fi" > /app/check_env.sh
CMD ["/bin/sh", "-c", ". /app/check_env.sh && npm start"]