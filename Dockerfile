# ------------------------------------------------------------------
# Imagen del frontend Ventas360 (Angular → nginx).
# Build multi-etapa: npm ci + ng build, sirve estáticos y proxy /api.
# ------------------------------------------------------------------

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

# --- Runtime -------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ventas360-web/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
