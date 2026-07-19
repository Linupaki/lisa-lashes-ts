FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# 1. Install ALL dependencies first (Prisma needs devDependencies to generate the client)
RUN npm ci

# 2. Copy the schema and migration definitions ahead of time
COPY prisma ./prisma/

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 4. Generate the Prisma Client before copying the rest of the source (better build caching)
RUN npx prisma generate

# 5. Copy the rest of your application code
COPY . .

# 6. Build your NestJS production binaries
RUN npx nest build

# 7. Prune development dependencies to keep the image lightweight
RUN npm prune --omit=dev

CMD ["node", "dist/src/main"]
