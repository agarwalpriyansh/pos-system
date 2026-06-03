# Stage 1: Build the Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git/certs if needed
RUN apk add --no-cache git ca-certificates

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Compile the binary, disabling CGO to build a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o worker main.go

# Stage 2: Run the binary in a clean minimal container
FROM alpine:latest

# Install certificates for external HTTPS network calls
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy compiled binary from builder
COPY --from=builder /app/worker .

# Command to run the worker
CMD ["./worker"]
