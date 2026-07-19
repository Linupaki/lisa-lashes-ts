FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npx nest build
RUN npm prune --omit=dev

CMD ["node", "dist/src/main"]
