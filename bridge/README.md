# AgentScape Bridge

OpenClaw gateway → scape BotSdk bridge. Translates session events into player actions on the running scape server, so OpenClaw agents appear as RuneScape characters in the dev-studio island.

See `../IMPLEMENTATION.md` for the full design.

## Setup

```bash
cd bridge
bun install
cp .env.example .env
# fill BOT_SDK_TOKEN (matches scape server) + GATEWAY_TOKEN
#   GATEWAY_TOKEN=$(openclaw config get gateway.auth.token)
bun run dev
```

## Prereqs

1. scape server running with `BOT_SDK_TOKEN` set:
   ```bash
   cd ../scape && BOT_SDK_TOKEN=dev-secret bun run server:start
   ```
2. OpenClaw gateway running locally (default `ws://localhost:18789`).

## Roster

Edit `../world/roster.json` to add pinned characters. Two ship by default:

- `OpenClaw` — driven by `agent:main:*` session events
- `IBoxBears` — driven by Discord posts from user `199450342453280768`

## Status taxonomy

5 states map directly to in-world actions. See `IMPLEMENTATION.md` §1.

## Milestones

- [x] M0: scaffold
- [ ] M1: always-on spawn (pending live test)
- [ ] M2: speaking
- [ ] M3: idle / working
- [ ] M4: tool-family walking
- [ ] M5: error → death (needs `playAnimation` PR)
- [ ] M6: `::steer` loop back into OpenClaw
- [ ] M7: dynamic sub-agent roster
