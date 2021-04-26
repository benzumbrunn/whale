FROM node:14-alpine3.13

WORKDIR /app

COPY LICENSE ./
COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/main"]
