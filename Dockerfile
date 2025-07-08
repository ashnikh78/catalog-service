# Build stage
FROM node:18 AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Rebuild sqlite3 from source (if needed)
RUN npm rebuild sqlite3 --build-from-source --sqlite=/usr/lib

# Install MySQL client dependencies for Node.js
RUN npm install mysql2 --save

# Copy source code
COPY . .

# Production stage
FROM node:18-slim
WORKDIR /app

# Create a non-root user to run the app
RUN useradd -m appuser

# Copy package.json, node_modules, and source code from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

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