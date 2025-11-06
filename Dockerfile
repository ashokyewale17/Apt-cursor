# Multi-stage build for production deployment

# Stage 1: Build React frontend
FROM node:22.12-alpine3.20 AS frontend-build
WORKDIR /app/client

# Update packages for security
RUN apk update && \
    apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Copy frontend package files
COPY client/package*.json ./
# Install with dev dependencies for build
RUN npm ci

# Copy frontend source and build
COPY client/ ./
RUN npm run build

# Stage 2: Setup backend  
FROM node:22.12-alpine3.20 AS backend-build
WORKDIR /app/server

# Update packages for security
RUN apk update && \
    apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Copy backend package files
COPY server/package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy backend source
COPY server/ ./

# Stage 3: Production image
FROM node:22.12-alpine3.20 AS production

# Update packages for security
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        ca-certificates \
        tzdata && \
    rm -rf /var/cache/apk/* \
           /tmp/* \
           /var/tmp/*

# Create app directory
WORKDIR /app

# Copy backend files
COPY --from=backend-build /app/server ./server
COPY --from=frontend-build /app/client/dist ./client/dist

# Copy root package.json for production scripts
COPY package*.json ./

# Create a minimal .env file for default values
RUN echo "NODE_ENV=production" > .env && \
    echo "PORT=5000" >> .env && \
    echo "HOST=0.0.0.0" >> .env

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server/server.js"]