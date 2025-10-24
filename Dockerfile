# Multi-stage build for Node.js backend
FROM node:18-alpine AS backend

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY backend/ ./

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Create uploads directory with proper permissions
RUN mkdir -p /app/frontend/img && chmod -R 777 /app/frontend/img

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["node", "server.js"]
