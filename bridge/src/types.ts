/**
 * Shared types for the bridge. Wire types for scape live in the scape
 * submodule — we mirror only what we need here.
 */

export type AgentScapeState =
    | "idle"
    | "working"
    | "speaking"
    | "tool_calling"
    | "error";

export type ToolFamily =
    | "read"
    | "write"
    | "shell"
    | "web"
    | "chat"
    | "memory"
    | "subagent"
    | "default";

export interface RosterEntry {
    /** Stable id used by the bridge for connection bookkeeping. */
    agentId: string;
    /** In-game display name. */
    displayName: string;
    /** True for OpenClaw/IBoxBears — never despawned. */
    pinned: boolean;
    /** Source predicate: which gateway events belong to this character. */
    source:
        | { kind: "session"; sessionPrefix: string }
        | { kind: "discord-user"; userId: string };
}

/** Common envelope from the OpenClaw gateway WebSocket. */
export interface GatewayEvent {
    runId?: string;
    seq?: number;
    stream: "lifecycle" | "tool" | "assistant" | "error" | "heartbeat" | "presence";
    ts?: number;
    sessionKey?: string;
    data: unknown;
}

/** Internal state event after mapping. */
export interface StateEvent {
    agentId: string;
    state: AgentScapeState;
    /** Original event details kept for downstream routing. */
    detail?: {
        text?: string;
        toolName?: string;
        toolFamily?: ToolFamily;
        errorMessage?: string;
    };
}
