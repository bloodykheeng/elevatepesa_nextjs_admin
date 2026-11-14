"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axiosAPI from "@/services/axiosApi";

/**
 * Laravel Echo on Reverb, for the API's live signals (pesa_back docs/realtime.md). Alpha's setup: one lazily created
 * client, private channels authorised through the API's Sanctum endpoint (POST /api/admin/broadcasting/auth) with the
 * same Bearer token as every other call, so no session cookie is involved.
 *
 * Settings (public, baked in at build): NEXT_PUBLIC_REVERB_APP_KEY, NEXT_PUBLIC_REVERB_HOST, NEXT_PUBLIC_REVERB_PORT,
 * NEXT_PUBLIC_REVERB_SCHEME. Production: api.elevatepesa.com, 443, https (nginx passes /app to Reverb).
 * Without a key it stays off and the screens fall back to refreshing when the tab comes back into view.
 */
type EchoClient = Echo<"reverb">;

let echo: EchoClient | null = null;

export function getEcho(): EchoClient | null {
  if (typeof window === "undefined") return null;
  if (echo) return echo;
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (!key) return null;

  // Echo's reverb broadcaster is built on pusher-js, which it looks for on window.
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

  echo = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        axiosAPI
          .post("/admin/broadcasting/auth", { socket_id: socketId, channel_name: channel.name })
          .then((res) => callback(null, res.data))
          .catch((err) => callback(err as Error, null));
      },
    }),
  });
  return echo;
}

/** Close the connection (sign-out): the next session authorises its own channels. */
export function disconnectEcho(): void {
  echo?.disconnect();
  echo = null;
}
