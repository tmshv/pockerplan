package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"pockerplan/ppback/avatar"
	"pockerplan/ppback/hub"
	"pockerplan/ppback/room"
	"pockerplan/ppback/scale"

	"github.com/rs/zerolog"
)

func newTestServer(t *testing.T) (*Server, func()) {
	t.Helper()
	logger := zerolog.Nop()
	rm := room.NewManager()
	h, err := hub.New(rm, 3, false, logger)
	if err != nil {
		t.Fatalf("create hub: %v", err)
	}
	if err := h.Run(); err != nil {
		t.Fatalf("run hub: %v", err)
	}

	frontFS := fstest.MapFS{
		"index.html":           {Data: []byte("<html>app</html>")},
		"assets/style.css":     {Data: []byte("body{}")},
		"assets/app.js":        {Data: []byte("console.log('app')")},
	}

	srv := New(h, frontFS, logger)
	cleanup := func() {
		_ = h.Shutdown()
	}
	return srv, cleanup
}

func TestHealthEndpoint(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var health map[string]string
	if err := json.Unmarshal(body, &health); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if health["status"] != "ok" {
		t.Errorf("expected ok, got %s", health["status"])
	}
}

func TestScalesEndpoint(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/scales", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json, got %s", ct)
	}

	body, _ := io.ReadAll(resp.Body)
	var scales []scale.EstimationScale
	if err := json.Unmarshal(body, &scales); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(scales) != 4 {
		t.Errorf("expected 4 scales, got %d", len(scales))
	}
}

func TestScalesMethodNotAllowed(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/api/scales", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Result().StatusCode)
	}
}

func TestAvatarsEndpoint(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/avatars", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var avatars []avatar.Avatar
	if err := json.Unmarshal(body, &avatars); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(avatars) != 16 {
		t.Errorf("expected 16 avatars, got %d", len(avatars))
	}
}

func TestAvatarsMethodNotAllowed(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/api/avatars", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Result().StatusCode)
	}
}

func TestSPAServesIndexHTML(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "<html>app</html>" {
		t.Errorf("expected index.html content, got %s", string(body))
	}
}

func TestSPAServesStaticFile(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/assets/style.css", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "body{}" {
		t.Errorf("expected css content, got %s", string(body))
	}
}

func TestSPAFallbackToIndex(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	// Client-side route that doesn't match any file
	req := httptest.NewRequest(http.MethodGet, "/room/abc123", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 (SPA fallback), got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "<html>app</html>" {
		t.Errorf("expected index.html content on fallback, got %s", string(body))
	}
}

func TestSPAFallbackDeepRoute(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/room/abc123/join", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 (SPA fallback), got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "<html>app</html>" {
		t.Errorf("expected index.html content on fallback, got %s", string(body))
	}
}

func TestWebSocketEndpointExists(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()

	// A GET to the WS endpoint without upgrade should not panic
	req := httptest.NewRequest(http.MethodGet, "/connection/websocket", nil)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	// It should respond (probably with 400 since no WS upgrade) — just verifying the route exists
	if w.Result().StatusCode == http.StatusNotFound {
		t.Error("websocket endpoint should be registered")
	}
}
