# AgentScape — Implementation Plan

This document is the working implementation guide for the OpenClaw → BotSdk bridge. It collapses the architecture in `ARCHITECTURE.md` into concrete contracts, file layout, and milestones.

## 1. Status Taxonomy (canonical 5-state)

Adopted from `WW-AI-Lab/openclaw-office` (the closest sibling visualizer). Every OpenClaw event the bridge consumes resolves to exactly one of:

| State          | Source signal (gateway WS)                                | RS-side intent                                                 |
|----------------|-----------------------------------------------------------|----------------------------------------------------------------|
| `idle`         | `lifecycle` `phase=end`, or no activity for `IDLE_MS`     | `walkTo` GE / sit on chair (anim 4072 frame 12 — already wired)|
| `working`      | `lifecycle` `phase=start`                                 | `walkTo` workstation, smithing/crafting anim                    |
| `speaking`     | `assistant` text frame                                    | `chatPublic` with the actual text (clipped)                     |
| `tool_calling` | `tool` event (`name=...`)                                 | `walkTo` zone keyed by tool family + tool anim                  |
| `error`        | `error` event                                             | death anim → respawn at lumbridge                               |

Secondary signals layered on top:
- `heartbeat` → keep-alive only; refresh "last seen" timestamp, no action emitted
- `presence` → assigns the agent to a building/room (room owner → spawn point)

## 2. Tool-family routing

Tool names from OpenClaw (`Read`, `Grep`, `Bash`, `WebSearch`, `Write`, `mcp__*`, …) collapse to a small zone alphabet:

| Tool family             | Patterns                                                  | Zone (placeholder coord)             |
|-------------------------|-----------------------------------------------------------|---------------------------------------|
| `read`                  | `Read`, `Glob`, `Grep`                                    | Library / bookshelves                 |
| `write`                 | `Write`, `Edit`, `NotebookEdit`                           | Smithing anvil                        |
| `shell`                 | `Bash`                                                    | Cooking range                         |
| `web`                   | `WebFetch`, `WebSearch`                                   | Magic / runic circle                  |
| `chat`                  | `mcp__openclaw__sessions_send`, `mcp__openclaw__message`  | Throne room / megaphone               |
| `memory`                | `mcp__openclaw__memory_*`                                 | Bank chest                            |
| `subagent`              | `Agent`, `Task`, `mcp__openclaw__sessions_spawn`          | Portal → spawns a child character     |
| `default`               | (anything else)                                           | Office desk                           |

Concrete tile coordinates for the dev-studio island live in `world/zones.json`.

## 3. Always-on roster

The world boots with two characters that never despawn:

| Display name | OpenClaw agentId                                       | Source of activity                             |
|--------------|--------------------------------------------------------|------------------------------------------------|
| `OpenClaw`   | `agent:main`                                           | gateway events for the main session            |
| `IBoxBears`  | `user:199450342453280768`                              | Discord typing/post events (`speaking` only)   |

`OpenClaw` is the root agent; everything I do in any session bubbles into the world. `IBoxBears` is the human — for now we surface only `speaking` (Discord posts → `chatPublic`); idle means standing nearby.

Sub-agents and one-shot crons spawn additional named characters on first activity and despawn after `SUBAGENT_TTL_MS` of silence.

## 4. Wire contracts

### 4.1 OpenClaw gateway (inbound)

- URL: `ws://localhost:18789` (override with `GATEWAY_URL`)
- Handshake:
  1. server → `{ kind: "connect.challenge", nonce }`
  2. client → `{ kind: "connect", clientId: "agentscape-bridge", scopes: ["operator.read"], auth: { token } }`
  3. server → `{ kind: "hello-ok" }`
- Event envelope: `{ runId, seq, stream, ts, data, sessionKey? }`
- Streams consumed: `lifecycle` | `tool` | `assistant` | `error` | `heartbeat` | `presence`
- Token: `openclaw config get gateway.auth.token` → `GATEWAY_TOKEN` env

### 4.2 scape BotSdk (outbound)

- URL: `ws://localhost:43595` (override with `SCAPE_URL`)
- Wire format: **TOON** (`@toon-format/toon`), not JSON
- Frames (subset we use): `auth`, `spawn`, `action` (`walkTo` | `chatPublic` | `attackNpc` | `dropItem` | `eatFood`), `disconnect`
- Token: `BOT_SDK_TOKEN` (must match scape server)
- One WS connection per active OpenClaw agent

### 4.3 Operator command (inbound from world)

When a player in-game types `::steer <text>`, the scape server pushes an `operatorCommand` frame. The bridge forwards it to the originating OpenClaw session via `mcp__openclaw__sessions_send`. This is the killer feedback loop — humans can poke the agent from inside the game.

## 5. Repo layout

```
AgentScape/
├── ARCHITECTURE.md          # high-level design
├── IMPLEMENTATION.md        # this file
├── README.md
├── scape/                   # submodule — xrsps server + browser client
├── bridge/                  # OpenClaw → BotSdk bridge (Bun/TS)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── README.md
│   └── src/
│       ├── index.ts             # entry, lifecycle
│       ├── config.ts            # env parsing
│       ├── openclaw-source.ts   # gateway WS client
│       ├── scape-client.ts      # BotSdk WS client (per agent)
│       ├── state-mapper.ts      # gateway event → AgentScapeState
│       ├── action-router.ts     # AgentScapeState → BotSdk action
│       ├── roster.ts            # always-on + dynamic agents
│       └── types.ts
└── world/
    ├── roster.json          # IBoxBears + OpenClaw + presets
    └── zones.json           # tile coords per tool family + landmarks
```

## 6. Milestones

| # | Milestone                                       | Definition of done                                                       |
|---|-------------------------------------------------|--------------------------------------------------------------------------|
| 0 | **Scaffold**                                    | `bridge/` builds with `bun run typecheck`; entry logs both endpoints.    |
| 1 | **Always-on spawn**                             | `OpenClaw` and `IBoxBears` characters appear in-world on bridge start.   |
| 2 | **Speaking**                                    | Discord posts and assistant text turn into `chatPublic` over the agent.  |
| 3 | **Idle / Working**                              | Lifecycle start/end moves the character between desk and chair.          |
| 4 | **Tool-family walking**                         | Each `tool` event routes the character to the corresponding zone.        |
| 5 | **Error → death**                               | `error` events trigger death anim and respawn (needs `playAnimation` PR).|
| 6 | **Steer loop**                                  | `::steer` from game forwards to OpenClaw session via `sessions_send`.    |
| 7 | **Sub-agent dynamic roster**                    | New agents spawn on first event, despawn after `SUBAGENT_TTL_MS`.        |

## 7. Open questions (defer)

- **`playAnimation` action** — needed for `error` death anim and tool-specific anims; requires a small PR to `BotSdkActionRouter`.
- **Persistence of agent characters** — should `OpenClaw` keep its bank/skills across reboots, or always start fresh? Current default: persistent (BotSdk uses normal player save path).
- **Tile coords** — placeholders in `world/zones.json`; pin to the dev-studio building once the bridge is up and we can eyeball positions.
- **Multi-session same agent** — if the main session has multiple concurrent runs, do we collapse to one character or fork? Default: collapse, queue actions.
