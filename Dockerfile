# Build stage
FROM node:18 AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies using npm ci for reproducibility
RUN npm ci

# Explicitly install prom-client to ensure it's included
RUN npm install prom-client@15.1.0 --save-exact

# Verify prom-client installation
RUN ls node_modules | grep prom-client || (echo "prom-client not found in node_modules" && exit 1)

# Install MySQL client dependencies for Node.js
RUN npm install mysql2 --save

# Copy source code
COPY . .

# Production stage
FROM node:18-slim
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run the app
RUN useradd -m appuser

# Copy package.json, node_modules, and source code from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Verify prom-client in production stage
RUN ls node_modules | grep prom-client || (echo "prom-client not found in production node_modules" && exit 1)

# Set ownership of the app files to the non-root user
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose the application port
EXPOSE 3011

# Healthcheck for the app
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3011/health || exit 1

# Check that the required environment variables are set
RUN echo "if [ -z \$DB_HOST ] || [ -z \$DB_NAME ] || [ -z \$DB_USER ] || [ -z \$DB_PASS ]; then echo 'Missing required environment variables'; exit 1; fi" > /app/check_env.sh

# Start the app, after checking environment variables
CMD ["/bin/sh", "-c", ". /app/check_env.sh && npm start"]