FROM node:22-alpine

WORKDIR /app

# Install curl for container healthchecks
RUN apk add --no-cache curl

COPY package.json package-lock.json tsconfig.base.json version.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

RUN npm install

EXPOSE 3000 3001 8000

ENV NODE_ENV=production \
    PORT_VTT=3000 \
    PORT_ADMIN=3001 \
    PORT_AI=8000 \
    HEARTHQUEST_DATA_DIR=/app/data

VOLUME ["/app/data"]

CMD ["npm", "run", "start:all"]
