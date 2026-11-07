FROM golang:1.26-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /sadaka-api .

FROM alpine:3.22
RUN apk --no-cache add ca-certificates && adduser -D -H app
USER app
COPY --from=builder /sadaka-api /sadaka-api
EXPOSE 8080
# Настройки передаются переменными окружения (см. .env.example).
CMD ["/sadaka-api"]
