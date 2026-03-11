# Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production server
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server
COPY server ./server

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
