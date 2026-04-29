/**
 * Gateway WebSocket client. Speaks the OpenClaw operator-pairing
 * handshake, then surfaces the four event streams used by the bridge:
 *   - lifecycle  (phase=start|end)
 *   - tool       (name=...)
 *   - assistant  (text=...)
 *   - error      (message=...)
 *
 * Heartbeat/presence are passed through but the state mapper drops
 * them. Reference for shapes: WW-AI-Lab/openclaw-office.
 */

import WebSocket from "ws";

import { config } from "./config";
import type { GatewayEvent } from "./types";

type Listener = (event: GatewayEvent) => void;

export class OpenClawSource {
    private ws: WebSocket | null = null;
    private readonly listeners = new Set<Listener>();
    private reconnectAttempts = 0;

    connect(): void {
        const ws = new WebSocket(config.gatewayUrl);
        this.ws = ws;

        ws.on("message", (raw) => this.onFrame(raw.toString()));
        ws.on("open", () => {
            console.log(`[gateway] open ${config.gatewayUrl}`);
        });
        ws.on("close", () => {
            console.warn("[gateway] closed; reconnecting…");
            this.scheduleReconnect();
        });
        ws.on("error", (err) => {
            console.error("[gateway] error:", err.message);
        });
    }

    onEvent(fn: Listener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private scheduleReconnect(): void {
        const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts++);
        setTimeout(() => this.connect(), delay);
    }

    private onFrame(raw: string): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return;
        }
        if (!parsed || typeof parsed !== "object") return;
        const frame = parsed as Record<string, unknown>;

        switch (frame.kind) {
            case "connect.challenge": {
                this.send({
                    kind: "connect",
                    clientId: "agentscape-bridge",
                    scopes: ["operator.read"],
                    auth: { token: config.gatewayToken },
                });
                return;
            }
            case "hello-ok": {
                console.log("[gateway] hello-ok");
                this.reconnectAttempts = 0;
                return;
            }
            case "event": {
                const event = frame as unknown as GatewayEvent & { kind: "event" };
                if (typeof event.stream !== "string") return;
                for (const fn of this.listeners) fn(event);
                return;
            }
            default:
                // Unknown frame kinds are ignored — the gateway adds new ones
                // over time and we don't want a crash on protocol drift.
                return;
        }
    }

    private send(frame: Record<string, unknown>): void {
        if (!this.ws) return;
        this.ws.send(JSON.stringify(frame));
    }
}
