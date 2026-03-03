import { Centrifuge } from "centrifuge";

let client: Centrifuge | null = null;

export function getCentrifuge(): Centrifuge {
  if (!client) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/connection/websocket`;
    client = new Centrifuge(url);
    client.connect();

    // Ensure connection is closed when page unloads
    window.addEventListener("beforeunload", disconnectCentrifuge, { once: true });
  }
  return client;
}

export function disconnectCentrifuge(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
