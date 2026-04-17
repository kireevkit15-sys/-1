import { io, Socket } from "socket.io-client";
import { WS_BASE } from "@/lib/api/base";

let socket: Socket | null = null;

/**
 * Get or create the Socket.IO client connected to /battle namespace.
 * Passes JWT token via handshake auth for server-side verification.
 */
export function getBattleSocket(token: string): Socket {
  if (socket?.connected) return socket;

  // Disconnect stale instance if exists
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(`${WS_BASE}/battle`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] connection error:", err.message);
  });

  return socket;
}

/**
 * Disconnect and clean up the socket instance.
 */
export function disconnectBattleSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance without creating a new one.
 * Returns null if not connected.
 */
export function getCurrentSocket(): Socket | null {
  return socket;
}
