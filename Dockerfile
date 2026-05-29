FROM node:22-slim

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install --omit=dev && npm install typescript

COPY src ./src
RUN npx tsc

ENV NODE_ENV=production
ENV HIVE_API_URL=https://api.thehivecollective.io
ENV HIVE_AGENT=glama-probe

# MCP servers communicate over stdio
CMD ["node", "dist/index.js"]
