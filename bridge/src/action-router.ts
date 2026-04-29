import zonesData from "../../world/zones.json" with { type: "json" };

import type { ScapeClient } from "./scape-client";
import type { StateEvent, ToolFamily } from "./types";

interface Tile {
    x: number;
    z: number;
    level: number;
}

const zones = zonesData as {
    spawn: Tile;
    landmarks: Record<string, Tile | undefined>;
    tools: Record<ToolFamily, Tile | undefined>;
};

const MAX_CHAT_LEN = 80;

function landmark(name: string): Tile {
    return zones.landmarks[name] ?? zones.spawn;
}

function toolZone(family: ToolFamily): Tile {
    return zones.tools[family] ?? zones.tools.default ?? zones.spawn;
}

export function dispatch(client: ScapeClient, event: StateEvent): void {
    if (!client.isSpawned()) return;

    switch (event.state) {
        case "idle": {
            const ge = landmark("ge");
            client.walkTo(ge.x, ge.z, false);
            return;
        }
        case "working": {
            const desk = landmark("office_desk");
            client.walkTo(desk.x, desk.z, true);
            return;
        }
        case "speaking": {
            const text = event.detail?.text?.slice(0, MAX_CHAT_LEN) ?? "";
            if (text) client.chatPublic(text);
            return;
        }
        case "tool_calling": {
            const family: ToolFamily = event.detail?.toolFamily ?? "default";
            const tile = toolZone(family);
            client.walkTo(tile.x, tile.z, true);
            return;
        }
        case "error": {
            const lumb = landmark("lumbridge");
            client.walkTo(lumb.x, lumb.z, true);
            const msg = event.detail?.errorMessage?.slice(0, MAX_CHAT_LEN) ?? "ouch";
            client.chatPublic(`💀 ${msg}`);
            return;
        }
    }
}
