# Stage 1: Build React Application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
# React 19 / Recharts peer warnings workaround
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx with SPA routing config
FROM nginx:stable-alpine

# Replace default nginx config with our SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
