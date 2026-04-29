import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { RosterEntry } from "./types";

interface RosterFile {
    pinned: Array<Omit<RosterEntry, "pinned">>;
}

const ROSTER_PATH = join(import.meta.dir, "..", "..", "world", "roster.json");

export function loadPinnedRoster(): RosterEntry[] {
    const raw = readFileSync(ROSTER_PATH, "utf8");
    const parsed = JSON.parse(raw) as RosterFile;
    return parsed.pinned.map((e) => ({ ...e, pinned: true }));
}

/**
 * Resolve which roster entry an event belongs to. Returns null when the
 * event doesn't match any pinned source — caller decides whether to
 * spawn a dynamic (sub-agent) entry.
 */
export function matchEntry(
    roster: RosterEntry[],
    event: { sessionKey?: string; senderUserId?: string },
): RosterEntry | null {
    for (const entry of roster) {
        if (entry.source.kind === "session" && event.sessionKey?.startsWith(entry.source.sessionPrefix)) {
            return entry;
        }
        if (entry.source.kind === "discord-user" && event.senderUserId === entry.source.userId) {
            return entry;
        }
    }
    return null;
}
