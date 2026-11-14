FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

RUN npm install

EXPOSE 3000 3001 8000

CMD ["npm", "run", "dev:vtt"]
