package main

import (
	"context"
	"embed"
	"io/fs"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pockerplan/ppback/hub"
	"pockerplan/ppback/room"
	"pockerplan/ppback/server"

	"github.com/alecthomas/kong"
	"github.com/rs/zerolog"
)

var cli struct {
	Addr      string `default:":8080" env:"ADDR" help:"Listen address."`
	Countdown int    `default:"3" env:"COUNTDOWN" help:"Countdown seconds before reveal."`
	Tickets   bool   `default:"false" env:"TICKETS" help:"Enable tickets feature."`
}

//go:embed ppfront/dist
var frontendFS embed.FS

func main() {
	kong.Parse(&cli)

	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		With().Timestamp().Logger()

	if cli.Countdown < 1 || cli.Countdown > 30 {
		logger.Fatal().Int("countdown", cli.Countdown).Msg("countdown must be between 1 and 30")
	}

	addr := cli.Addr

	// Frontend FS: strip the ppfront/dist prefix so files are served from root
	frontFS, err := fs.Sub(frontendFS, "ppfront/dist")
	if err != nil {
		logger.Fatal().Err(err).Msg("frontend fs")
	}

	// Room manager with periodic cleanup
	rm := room.NewManager()
	cleanupDone := make(chan struct{})
	rm.StartCleanup(10*time.Minute, cleanupDone)

	// Centrifuge hub
	h, err := hub.New(rm, cli.Countdown, cli.Tickets, logger.With().Str("component", "hub").Logger())
	if err != nil {
		logger.Fatal().Err(err).Msg("create hub")
	}
	if err := h.Run(); err != nil {
		logger.Fatal().Err(err).Msg("run hub")
	}

	// HTTP server
	srv := server.New(h, frontFS, logger.With().Str("component", "server").Logger())
	httpServer := &http.Server{
		Addr:    addr,
		Handler: srv,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("listen")
		}
	}()

	logger.Info().Str("addr", addr).Msg("server started")

	<-quit
	logger.Info().Msg("shutting down")

	close(cleanupDone)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error().Err(err).Msg("http shutdown")
	}
	if err := h.Shutdown(); err != nil {
		logger.Error().Err(err).Msg("hub shutdown")
	}

	logger.Info().Msg("server stopped")
}
