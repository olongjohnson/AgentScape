import type { AgentScapeState, GatewayEvent, StateEvent, ToolFamily } from "./types";

const TOOL_FAMILIES: Array<[RegExp, ToolFamily]> = [
    [/^(Read|Glob|Grep)$/, "read"],
    [/^(Write|Edit|NotebookEdit)$/, "write"],
    [/^Bash$/, "shell"],
    [/^(WebFetch|WebSearch)$/, "web"],
    [/^mcp__openclaw__memory_/, "memory"],
    [/^(mcp__openclaw__sessions_send|mcp__openclaw__message)$/, "chat"],
    [/^(Agent|Task|mcp__openclaw__sessions_spawn|mcp__openclaw__subagents)$/, "subagent"],
];

export function classifyTool(name: string): ToolFamily {
    for (const [pattern, family] of TOOL_FAMILIES) {
        if (pattern.test(name)) return family;
    }
    return "default";
}

/**
 * Map a gateway event to an internal state event. Returns null when the
 * event has no in-world consequence (e.g. heartbeats).
 */
export function mapEvent(agentId: string, event: GatewayEvent): StateEvent | null {
    const data = (event.data ?? {}) as Record<string, unknown>;

    switch (event.stream) {
        case "lifecycle": {
            const phase = typeof data.phase === "string" ? data.phase : undefined;
            const state: AgentScapeState | null =
                phase === "start" ? "working" : phase === "end" ? "idle" : null;
            return state ? { agentId, state } : null;
        }
        case "tool": {
            const toolName = typeof data.name === "string" ? data.name : "unknown";
            return {
                agentId,
                state: "tool_calling",
                detail: { toolName, toolFamily: classifyTool(toolName) },
            };
        }
        case "assistant": {
            const text = typeof data.text === "string" ? data.text : "";
            if (!text.trim()) return null;
            return { agentId, state: "speaking", detail: { text } };
        }
        case "error": {
            const message = typeof data.message === "string" ? data.message : "error";
            return { agentId, state: "error", detail: { errorMessage: message } };
        }
        case "heartbeat":
        case "presence":
            return null;
    }
}
