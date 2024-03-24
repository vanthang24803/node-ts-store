FROM node:latest-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY  . .

EXPOSE 8080

CMD [ "npm", "run" , "dev" ]