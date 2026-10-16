# build stage
FROM golang:1.24-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod download

COPY . .
RUN go build -ldflags="-s -w" -o /out/admin-api ./cmd/api

# runtime stage
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app
COPY --from=builder /out/admin-api /app/admin-api
COPY cmd/api/etc/admin-api.yaml /app/etc/admin-api.yaml

EXPOSE 8080
ENTRYPOINT ["/app/admin-api", "-f", "/app/etc/admin-api.yaml"]