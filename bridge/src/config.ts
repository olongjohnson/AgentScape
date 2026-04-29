function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`missing env var: ${name}`);
    return v;
}

function optional(name: string, fallback: string): string {
    return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) throw new Error(`env ${name} is not an int: ${raw}`);
    return n;
}

export const config = {
    scapeUrl: optional("SCAPE_URL", "ws://localhost:43595"),
    botSdkToken: required("BOT_SDK_TOKEN"),
    gatewayUrl: optional("GATEWAY_URL", "ws://localhost:18789"),
    gatewayToken: required("GATEWAY_TOKEN"),
    agentDefaultPassword: optional("AGENT_DEFAULT_PASSWORD", "agentscape"),
    idleMs: int("IDLE_MS", 15_000),
    subagentTtlMs: int("SUBAGENT_TTL_MS", 600_000),
} as const;
