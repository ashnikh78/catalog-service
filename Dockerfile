# Build stage
FROM node:18 AS builder
WORKDIR /app

# Install build dependencies for MySQL and SQLite3 (as a fallback)
RUN apt-get update && apt-get install -y python3 make g++ libsqlite3-dev libmariadb-dev && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts

# Rebuild sqlite3 from source (fallback)
RUN npm rebuild sqlite3 --build-from-source --sqlite=/usr/lib

# Install MySQL client dependencies
RUN npm install mysql2 --save

# Copy source code
COPY . .

# Production stage
FROM node:18-slim
WORKDIR /app

# Create a non-root user to run the app
RUN useradd -m appuser
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# Install production dependencies
RUN npm ci --production --ignore-scripts

# Set the ownership of the app files to the non-root user
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose the application port
EXPOSE 3011

# Healthcheck for the app
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3011/health || exit 1

# Check that the required environment variables are set
RUN echo "if [ -z \$DB_HOST ] || [ -z \$DB_NAME ] || [ -z \$DB_USER ] || [ -z \$DB_PASSWORD ]; then echo 'Missing required environment variables'; exit 1; fi" > /app/check_env.sh

# Start the app, after checking environment variables
CMD ["/bin/sh", "-c", ". /app/check_env.sh && npm start"]
