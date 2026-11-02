FROM node:24 AS build
WORKDIR /app
ARG VITE_REVERB_APP_KEY=notes-local-key
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html