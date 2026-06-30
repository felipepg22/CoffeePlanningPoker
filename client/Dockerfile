# syntax=docker/dockerfile:1.7

FROM node:20.19.0-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist/coffee-planning-poker/browser /usr/share/nginx/html

RUN <<'EOF'
cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(?:css|gif|ico|jpeg|jpg|js|png|svg|webp|woff2?)$ {
    try_files $uri =404;
    access_log off;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
NGINX
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
