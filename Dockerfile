FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING
ARG NEXT_PUBLIC_VERSION_TAG

# Set environment variables for build time
ENV NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=$NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING
ENV NEXT_PUBLIC_VERSION_TAG=$NEXT_PUBLIC_VERSION_TAG

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set runtime environment variables
ENV NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=$NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING
ENV NEXT_PUBLIC_VERSION_TAG=$NEXT_PUBLIC_VERSION_TAG

EXPOSE 3000
CMD ["node", "server.js"]