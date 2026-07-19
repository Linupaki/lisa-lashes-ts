FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build with verbose output and verify dist exists
RUN npx nest build && \
    echo "=== BUILD COMPLETE ===" && \
    ls -la dist/ && \
    echo "=== main.js exists ===" && \
    test -f dist/main.js

RUN npm prune --omit=dev

CMD ["node", "dist/main"]
