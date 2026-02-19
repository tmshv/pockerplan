package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pockerplan/ppback/hub"
	"pockerplan/ppback/room"
	"pockerplan/ppback/server"
)

//go:embed ppfront/dist
var frontendFS embed.FS

func main() {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	// Frontend FS: strip the ppfront/dist prefix so files are served from root
	frontFS, err := fs.Sub(frontendFS, "ppfront/dist")
	if err != nil {
		log.Fatalf("frontend fs: %v", err)
	}

	// Room manager with periodic cleanup
	rm := room.NewManager()
	cleanupDone := make(chan struct{})
	rm.StartCleanup(10*time.Minute, cleanupDone)

	// Centrifuge hub
	h, err := hub.New(rm)
	if err != nil {
		log.Fatalf("create hub: %v", err)
	}
	if err := h.Run(); err != nil {
		log.Fatalf("run hub: %v", err)
	}

	// HTTP server
	srv := server.New(h, frontFS)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: srv,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	log.Printf("pockerplan server started on %s", addr)

	<-quit
	log.Println("shutting down...")

	close(cleanupDone)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("http shutdown: %v", err)
	}
	if err := h.Shutdown(); err != nil {
		log.Printf("hub shutdown: %v", err)
	}

	log.Println("server stopped")
}
