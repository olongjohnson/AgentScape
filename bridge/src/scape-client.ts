/**
 * One WebSocket per spawned agent. Connects to the scape BotSdkServer,
 * authenticates, spawns the player, and exposes a tiny verb API
 * (walkTo, chatPublic, attackNpc) used by the action router.
 *
 * Wire format: TOON. We import @toon-format/toon to mirror what the
 * server uses; frame shapes mirror scape's BotSdkProtocol.ts.
 */

import { decode, encode } from "@toon-format/toon";
import WebSocket from "ws";

import { config } from "./config";

type ScapeFrame = Record<string, unknown>;

export class ScapeClient {
    private ws: WebSocket | null = null;
    private spawned = false;
    private nextCorrelationId = 1;
    private readonly pendingAcks = new Map<string, (ok: boolean, msg?: string) => void>();

    constructor(
        private readonly agentId: string,
        private readonly displayName: string,
        private readonly onOperatorCommand?: (text: string, fromName?: string) => void,
    ) {}

    async connect(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(config.scapeUrl);
            this.ws = ws;
            ws.once("open", () => resolve());
            ws.once("error", (err) => reject(err));
            ws.on("message", (raw) => this.onFrame(raw.toString()));
            ws.on("close", () => {
                this.ws = null;
                this.spawned = false;
            });
        });

        this.send({ kind: "auth", token: config.botSdkToken, version: 1 });
        this.send({
            kind: "spawn",
            agentId: this.agentId,
            displayName: this.displayName,
            password: config.agentDefaultPassword,
            controller: "user",
        });
    }

    walkTo(x: number, z: number, run = true): void {
        this.action({ action: "walkTo", x, z, run });
    }

    chatPublic(text: string): void {
        this.action({ action: "chatPublic", text });
    }

    attackNpc(npcId: number): void {
        this.action({ action: "attackNpc", npcId });
    }

    disconnect(reason?: string): void {
        if (!this.ws) return;
        try {
            this.send({ kind: "disconnect", reason });
        } finally {
            this.ws.close();
            this.ws = null;
        }
    }

    isSpawned(): boolean {
        return this.spawned;
    }

    private action(body: ScapeFrame): void {
        if (!this.ws || !this.spawned) return;
        const correlationId = String(this.nextCorrelationId++);
        this.send({ kind: "action", correlationId, ...body });
    }

    private send(frame: ScapeFrame): void {
        if (!this.ws) return;
        const encoded = encode(frame);
        this.ws.send(encoded);
    }

    private onFrame(raw: string): void {
        let parsed: unknown;
        try {
            parsed = decode(raw);
        } catch (err) {
            console.warn(`[scape:${this.displayName}] decode failed:`, err);
            return;
        }
        if (!parsed || typeof parsed !== "object") return;
        const frame = parsed as ScapeFrame;
        switch (frame.kind) {
            case "authOk":
                console.log(`[scape:${this.displayName}] auth ok`);
                break;
            case "spawnOk":
                this.spawned = true;
                console.log(
                    `[scape:${this.displayName}] spawned at (${frame.x}, ${frame.z}) playerId=${frame.playerId}`,
                );
                break;
            case "ack": {
                const cid = String(frame.correlationId ?? "");
                const handler = this.pendingAcks.get(cid);
                if (handler) {
                    this.pendingAcks.delete(cid);
                    handler(Boolean(frame.success), typeof frame.message === "string" ? frame.message : undefined);
                }
                break;
            }
            case "error":
                console.error(`[scape:${this.displayName}] error:`, frame.code, frame.message);
                break;
            case "operatorCommand":
                if (this.onOperatorCommand) {
                    const text = typeof frame.text === "string" ? frame.text : "";
                    const fromName = typeof frame.fromPlayerName === "string" ? frame.fromPlayerName : undefined;
                    this.onOperatorCommand(text, fromName);
                }
                break;
            case "perception":
                // ignored for now; available for future feedback loops
                break;
        }
    }
}
