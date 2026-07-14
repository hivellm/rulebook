import path from 'path';
import { promises as fs } from 'fs';

/**
 * v7: the npm update check lives in the CLI (invoked from `init`/`update`),
 * replacing the retired SessionStart hook (F-002 — zero session-start spawns).
 * Cached for 24h in `.rulebook/.update-check`; every failure is silent — a
 * version check must never break or slow a command noticeably.
 */

const CACHE_FILE = '.update-check';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;
const REGISTRY_URL = 'https://registry.npmjs.org/@hivehub/rulebook/latest';

interface UpdateCheckCache {
    checkedAt: number;
    latest: string;
}

/** True when `a` is a strictly newer semver than `b` (numeric segments only). */
function isNewer(a: string, b: string): boolean {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
        if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
    }
    return false;
}

/**
 * Returns an advisory string when a newer version exists, otherwise null.
 * Never throws.
 */
export async function checkForUpdate(
    projectRoot: string,
    currentVersion: string
): Promise<string | null> {
    try {
        const cachePath = path.join(projectRoot, '.rulebook', CACHE_FILE);
        let latest: string | null = null;

        try {
            const raw = await fs.readFile(cachePath, 'utf-8');
            const cache = JSON.parse(raw) as UpdateCheckCache;
            if (Date.now() - cache.checkedAt < CACHE_TTL_MS && cache.latest) {
                latest = cache.latest;
            }
        } catch {
            // no cache — fall through to fetch
        }

        if (!latest) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            try {
                const res = await fetch(REGISTRY_URL, { signal: controller.signal });
                if (!res.ok) return null;
                const data = (await res.json()) as { version?: string };
                latest = data.version ?? null;
            } finally {
                clearTimeout(timer);
            }
            if (latest) {
                const cache: UpdateCheckCache = { checkedAt: Date.now(), latest };
                await fs
                    .mkdir(path.dirname(cachePath), { recursive: true })
                    .then(() => fs.writeFile(cachePath, JSON.stringify(cache)))
                    .catch(() => {});
            }
        }

        if (latest && isNewer(latest, currentVersion)) {
            return `A newer @hivehub/rulebook is available: ${currentVersion} → ${latest}. Run: npm i -g @hivehub/rulebook`;
        }
        return null;
    } catch {
        return null;
    }
}
