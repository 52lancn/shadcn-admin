# build stage
FROM node:20-alpine AS builder

WORKDIR /build
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

# runtime stage
FROM nginx:1.27-alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]