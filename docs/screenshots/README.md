# Screenshots

A small curated set of screenshots kept as visual milestones of the
AgentScape office.

## Archival strategy

- Only commit a screenshot here when it marks a **visually distinct
  state** the team will want to refer back to later (new building
  layout, new feature landing, noteworthy bug visible).
- Name files with a two-digit sort prefix so the archive reads like a
  timeline: `NN-short-name.png`.
- Replace, don't append: when a milestone's visual is superseded by a
  follow-up (same building, tweaked furniture), overwrite the same
  archive entry rather than keeping both.

## Where else screenshots land

- **Repo root** — ignored by `.gitignore` (`/*.png`). Playwright MCP
  drops ad-hoc debugging shots here during sessions; they should not
  be promoted unless they become a milestone.
- **`.playwright-mcp/`** — Playwright MCP's own session directory with
  timestamped shots, snapshots, and console logs. Also gitignored.

## Current archive

| File | Milestone |
|---|---|
| `archive/01-open-plan.png` | Building switched to one open floor (interior walls removed) with role zones around the perimeter. |
| `archive/02-bookcases-flush.png` | Bookcases re-anchored flush against the perimeter walls; lounge furniture removed. |
| `archive/03-kitchen-and-agents-panel.png` | Kitchen cluster added in the SE corner; Agents sidebar plugin shipped. |
| `archive/04-first-spawned-agent.png` | First client-side agent spawn landing at a dev-pit chair alongside the player. |
| `archive/05-building-overview.png` | Pulled-back view of the studio after the zoom defaults were restored. |
