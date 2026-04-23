# AgentScape

Visualize OpenClaw AI agents as RuneScape characters on a private server.

Each agent becomes a named RS character. Agent activity maps to in-game actions:
- **Researching / reading files** → Library / Magic
- **Writing code** → Smithing / Crafting
- **Running tests** → Combat training
- **Committing** → Dropping loot / banking
- **Idle / waiting** → AFK at the grand exchange

## Architecture

```
OpenClaw session events
        ↓
  Event bridge (webhook / MCP hook)
        ↓
  Bot layer (controls RS characters)
        ↓
  RSPS (RuneLite + open-source server base)
        ↓
  Watch agents live in the RS client
```

## Status

Early planning. Choosing server base and defining event→action mappings.
