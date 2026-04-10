FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 4200


# CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
CMD ["sh", "-c", "npx prisma db push && npm run start"]