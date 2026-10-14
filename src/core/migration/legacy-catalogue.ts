import { createHash } from 'crypto';
import { readFileSync } from 'fs';

/**
 * Content-hash catalogue of every file a rulebook release since v5.0.0
 * installed under `.claude/{rules,agents,skills,commands,hooks}/`,
 * `.rulebook/specs/` and `.rulebook/rules/`, in the installed (projected)
 * form. Built from the git tags by `scripts/build-legacy-catalogue.mjs` and
 * shipped as `legacy-catalogue.json` next to this module.
 *
 * A file whose normalized hash is listed for its path is an unedited
 * rulebook file; any other content at that path was edited by the user.
 */

interface CatalogueJson {
    hashLength: number;
    releases: string[];
    files: Record<string, string>;
}

interface Catalogue {
    hashLength: number;
    files: Map<string, Set<string>>;
}

let cache: Catalogue | null = null;

function load(): Catalogue {
    if (cache) return cache;
    const raw = JSON.parse(
        readFileSync(new URL('./legacy-catalogue.json', import.meta.url), 'utf-8')
    ) as CatalogueJson;
    const files = new Map<string, Set<string>>();
    for (const [key, joined] of Object.entries(raw.files)) {
        const hashes = new Set<string>();
        for (let i = 0; i < joined.length; i += raw.hashLength) {
            hashes.add(joined.slice(i, i + raw.hashLength));
        }
        files.set(key, hashes);
    }
    cache = { hashLength: raw.hashLength, files };
    return cache;
}

/**
 * Normalize before hashing: drop a BOM, CRLF/CR → LF, strip trailing
 * whitespace on every line and trailing blank lines. Must match the script.
 */
export function normalizeContent(content: string): string {
    const noBom = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
    return noBom
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n+$/, '');
}

/** Truncated sha256 of the normalized content (catalogue width). */
export function contentHash(content: string): string {
    return createHash('sha256')
        .update(normalizeContent(content), 'utf8')
        .digest('hex')
        .slice(0, load().hashLength);
}

/** Catalogue key: repo-relative, forward slashes, lowercase. */
function keyOf(relPath: string): string {
    return relPath.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

/** True when some rulebook release installed a file at this path. */
export function isCataloguedPath(relPath: string): boolean {
    return load().files.has(keyOf(relPath));
}

/** True when `content` is what some rulebook release installed at `relPath`. */
export function isCatalogued(relPath: string, content: string): boolean {
    const hashes = load().files.get(keyOf(relPath));
    return hashes !== undefined && hashes.has(contentHash(content));
}
