FROM node:20-alpine

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

# Remove devDependencies after build to slim the image
RUN npm prune --omit=dev

# Start — real DATABASE_URL comes from Railway env vars at runtime
CMD ["node", "dist/main"]
