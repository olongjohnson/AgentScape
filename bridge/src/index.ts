/**
 * AgentScape bridge entry point.
 *
 * Lifecycle:
 *   1. Load .env, log endpoints.
 *   2. Load pinned roster (OpenClaw + IBoxBears).
 *   3. Connect to scape BotSdk and spawn each pinned character.
 *   4. Connect to OpenClaw gateway and subscribe to events.
 *   5. Map → dispatch every matching event into a scape action.
 */

import { config } from "./config";
import { dispatch } from "./action-router";
import { OpenClawSource } from "./openclaw-source";
import { matchEntry, loadPinnedRoster } from "./roster";
import { ScapeClient } from "./scape-client";
import { mapEvent } from "./state-mapper";

import type { GatewayEvent } from "./types";

async function main(): Promise<void> {
    console.log("[agentscape-bridge] starting");
    console.log(`  scape:    ${config.scapeUrl}`);
    console.log(`  gateway:  ${config.gatewayUrl}`);

    const roster = loadPinnedRoster();
    const clients = new Map<string, ScapeClient>();

    for (const entry of roster) {
        const client = new ScapeClient(
            entry.agentId,
            entry.displayName,
            (text, fromName) => {
                // Operator command from the game world. For now, log.
                // TODO(milestone-6): forward via mcp__openclaw__sessions_send.
                console.log(
                    `[steer→${entry.displayName}] ${fromName ? `(${fromName}) ` : ""}${text}`,
                );
            },
        );
        try {
            await client.connect();
            clients.set(entry.agentId, client);
            console.log(`[bridge] connected ${entry.displayName} (${entry.agentId})`);
        } catch (err) {
            console.error(`[bridge] failed to connect ${entry.displayName}:`, err);
        }
    }

    const source = new OpenClawSource();
    source.connect();

    source.onEvent((event: GatewayEvent) => {
        const senderUserId = extractDiscordUserId(event);
        const entry = matchEntry(roster, { sessionKey: event.sessionKey, senderUserId });
        if (!entry) return; // dynamic roster comes in milestone 7

        const stateEvent = mapEvent(entry.agentId, event);
        if (!stateEvent) return;

        const client = clients.get(entry.agentId);
        if (!client) return;

        dispatch(client, stateEvent);
    });

    process.on("SIGINT", () => shutdown(clients));
    process.on("SIGTERM", () => shutdown(clients));
}

function extractDiscordUserId(event: GatewayEvent): string | undefined {
    const data = event.data as Record<string, unknown> | undefined;
    if (!data) return undefined;
    const sender = data.senderUserId ?? data.discordUserId;
    return typeof sender === "string" ? sender : undefined;
}

function shutdown(clients: Map<string, ScapeClient>): void {
    console.log("[bridge] shutting down");
    for (const c of clients.values()) c.disconnect("bridge stop");
    process.exit(0);
}

void main();
