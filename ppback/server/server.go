package server

import (
	"bufio"
	"encoding/json"
	"errors"
	"io/fs"
	"net"
	"net/http"
	"time"

	"pockerplan/ppback/avatar"
	"pockerplan/ppback/hub"
	"pockerplan/ppback/scale"

	"github.com/centrifugal/centrifuge"
	"github.com/rs/zerolog"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// Unwrap returns the underlying ResponseWriter for Go 1.20+ interface detection.
func (rw *responseWriter) Unwrap() http.ResponseWriter {
	return rw.ResponseWriter
}

// Hijack implements http.Hijacker, required for WebSocket upgrades.
func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := rw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("underlying ResponseWriter does not implement http.Hijacker")
	}
	return h.Hijack()
}

// Flush implements http.Flusher for streaming responses.
func (rw *responseWriter) Flush() {
	if f, ok := rw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Server holds the HTTP server dependencies.
type Server struct {
	hub     *hub.Hub
	frontFS fs.FS
	logger  zerolog.Logger
	mux     *http.ServeMux
}

// New creates a new Server with all routes configured.
// frontFS should be the subdirectory of the embedded FS pointing at the built frontend (e.g. ppfront/dist).
func New(h *hub.Hub, frontFS fs.FS, logger zerolog.Logger) *Server {
	s := &Server{
		hub:     h,
		frontFS: frontFS,
		logger:  logger,
		mux:     http.NewServeMux(),
	}
	s.routes()
	return s
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Skip request logging for WebSocket connections (long-lived, misleading duration).
	if r.URL.Path == "/connection/websocket" {
		s.mux.ServeHTTP(w, r)
		return
	}
	start := time.Now()
	rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
	s.mux.ServeHTTP(rw, r)
	s.logger.Info().
		Str("method", r.Method).
		Str("path", r.URL.Path).
		Int("status", rw.status).
		Dur("duration", time.Since(start)).
		Str("remote", r.RemoteAddr).
		Msg("request")
}

func (s *Server) routes() {
	// WebSocket endpoint for centrifuge
	wsHandler := centrifuge.NewWebsocketHandler(s.hub.Node(), centrifuge.WebsocketConfig{
		CheckOrigin: func(r *http.Request) bool { return true },
	})
	s.mux.Handle("/connection/websocket", wsHandler)

	// API endpoints
	s.mux.HandleFunc("/api/scales", s.handleScales)
	s.mux.HandleFunc("/api/avatars", s.handleAvatars)
	s.mux.HandleFunc("/api/health", s.handleHealth)

	// SPA fallback: serve static files, fall back to index.html for client-side routing
	s.mux.Handle("/", s.spaHandler())
}

func (s *Server) handleScales(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scale.All())
}

func (s *Server) handleAvatars(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(avatar.All())
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// spaHandler returns an http.Handler that serves static files from frontFS
// and falls back to index.html for paths that don't match a file.
func (s *Server) spaHandler() http.Handler {
	fileServer := http.FileServer(http.FS(s.frontFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to open the requested path in the frontend FS.
		path := r.URL.Path
		if path == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Strip leading slash for fs.Open
		fsPath := path[1:]
		f, err := s.frontFS.Open(fsPath)
		if err != nil {
			// File not found — serve index.html for SPA client-side routing
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
			return
		}
		f.Close()

		// File exists — serve it
		fileServer.ServeHTTP(w, r)
	})
}
