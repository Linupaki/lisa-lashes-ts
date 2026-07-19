FROM node:20-alpine

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Remove devDependencies after build to slim the image
RUN npm prune --omit=dev

# Start
CMD ["node", "dist/main"]
