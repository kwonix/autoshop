# Multi-stage build for Node.js backend
FROM node:18-alpine AS backend

WORKDIR /app/backend

# Copy backend files
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

# Expose backend port
EXPOSE 3000

CMD ["node", "server.js"]
