# AgentScape Architecture

## Overview

AgentScape bridges OpenClaw session events to a RuneScape private server, rendering each AI agent as a named player character in a shared world.

## Server Base

**[xrsps/xrsps-typescript](https://github.com/xrsps/xrsps-typescript)** via the **[Prompt-or-Die-Labs/scape](https://github.com/Prompt-or-Die-Labs/scape)** fork.

- TypeScript + Bun, browser client (no Java launcher)
- Ships `BotSdkServer` on `:43595` — a WebSocket protocol for spawning and controlling player characters programmatically
- Agents are first-class players in the same tick loop as human players

## Event Bridge

```
OpenClaw session events (hooks/webhooks)
              ↓
     bridge/ (TypeScript, Bun)
              ↓
   BotSdkServer ws://localhost:43595
              ↓
   Named player characters in-world
```

The bridge maintains one WebSocket connection per active agent. On connect it sends `auth` then `spawn { username }`.

## Activity → Action Mapping

| Agent activity         | In-game action                          |
|------------------------|-----------------------------------------|
| Reading files          | `walkTo` library / bookshelf area       |
| Writing code           | Smithing / Crafting station             |
| Running tests          | `attackNpc` on training dummy           |
| Committing             | `chatPublic` with commit message        |
| Waiting for response   | `walkTo` Grand Exchange, idle           |
| Error / crash          | Death animation, respawn at lumbridge   |

## BotSdk Protocol (key frames)

```ts
// Spawn an agent character
{ type: "spawn", username: "Agent-A", password: "..." }

// Move to a location
{ type: "action", action: { type: "walkTo", x: 3210, y: 3424 } }

// Speak a message
{ type: "action", action: { type: "chatPublic", message: "committing: fix double-transform" } }

// TODO: playAnimation (needs PR to BotSdkActionRouter)
{ type: "action", action: { type: "playAnimation", id: 866 } }
```

## Key Files in scape server

| Path | Purpose |
|------|---------|
| `server/src/network/botsdk/BotSdkProtocol.ts` | Wire format |
| `server/src/network/botsdk/BotSdkActionRouter.ts` | Action dispatch (add new verbs here) |
| `server/src/agent/AgentComponent.ts` | Player-attached agent component |
| `docs/agent-endpoint.md` | Full protocol docs |

## Repo Structure

```
AgentScape/
├── scape/          # git submodule — xrsps server + browser client
├── bridge/         # OpenClaw → BotSdk event bridge (Bun/TypeScript)
├── world/          # World config, zone definitions, spawn points
└── ARCHITECTURE.md
```
