.PHONY: build build-frontend build-backend test test-frontend test-backend dev

build: build-frontend build-backend
build-linux: build-frontend build-backend-linux

build-frontend:
	cd ppfront && npm ci && npm run build

build-backend:
	go build -o bin/pockerplan .

build-backend-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/pockerplan-linux-amd64 .

test: test-backend test-frontend

test-frontend:
	cd ppfront && npm run test -- --run

test-backend:
	go test ./ppback/...

dev:
	@echo "Starting dev servers..."
	@trap 'kill 0' EXIT; \
	(cd ppfront && npm run dev) & \
	go run . & \
	wait
