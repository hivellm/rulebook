/**
 * Minimal, tolerant TOML reader for the few Codex `config.toml` fields the
 * perf doctor reads: table headers with quoted segments, string / number /
 * boolean values and (multi-line) arrays of those. Inline tables, multi-line
 * strings and array tables are kept as raw text or skipped; a malformed line
 * never throws. Not a general TOML parser.
 */

export type TomlValue = string | number | boolean | TomlValue[] | TomlTable;
export interface TomlTable {
    [key: string]: TomlValue;
}

/** Split a dotted key (`a."b.c".'d'`) into its segments. */
export function splitTomlKey(raw: string): string[] {
    const parts: string[] = [];
    let i = 0;
    const s = raw.trim();
    while (i < s.length) {
        while (s[i] === ' ' || s[i] === '\t') i++;
        if (s[i] === '"' || s[i] === "'") {
            const quote = s[i];
            let j = i + 1;
            let out = '';
            while (j < s.length && s[j] !== quote) {
                if (quote === '"' && s[j] === '\\' && j + 1 < s.length) {
                    out += unescapeBasic(s[j + 1]);
                    j += 2;
                    continue;
                }
                out += s[j];
                j++;
            }
            parts.push(out);
            i = j + 1;
        } else {
            let j = i;
            while (j < s.length && s[j] !== '.') j++;
            parts.push(s.slice(i, j).trim());
            i = j;
        }
        while (s[i] === ' ' || s[i] === '\t') i++;
        if (s[i] === '.') i++;
    }
    return parts.filter((p) => p.length > 0 || parts.length === 1);
}

function unescapeBasic(c: string): string {
    switch (c) {
        case 'n':
            return '\n';
        case 't':
            return '\t';
        case 'r':
            return '\r';
        default:
            return c;
    }
}

/** Index just past the closing quote of the string starting at `i`. */
function skipString(s: string, i: number): number {
    const quote = s[i];
    let j = i + 1;
    while (j < s.length && s[j] !== quote) {
        if (quote === '"' && s[j] === '\\') j++;
        j++;
    }
    return j + 1;
}

/** Remove a trailing `# comment` outside strings. */
function stripComment(line: string): string {
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' || c === "'") {
            i = skipString(line, i) - 1;
        } else if (c === '#') {
            return line.slice(0, i);
        }
    }
    return line;
}

/** Bracket depth change of a line, ignoring brackets inside strings. */
function bracketDelta(line: string): number {
    let d = 0;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' || c === "'") i = skipString(line, i) - 1;
        else if (c === '[' || c === '{') d++;
        else if (c === ']' || c === '}') d--;
    }
    return d;
}

function parseValue(raw: string): TomlValue {
    const v = raw.trim();
    if (v.startsWith('"') || v.startsWith("'")) {
        return splitTomlKey(v)[0] ?? '';
    }
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v.startsWith('[')) {
        const inner = v.slice(1, v.lastIndexOf(']'));
        const items: TomlValue[] = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < inner.length; i++) {
            const c = inner[i];
            if (c === '"' || c === "'") i = skipString(inner, i) - 1;
            else if (c === '[' || c === '{') depth++;
            else if (c === ']' || c === '}') depth--;
            else if (c === ',' && depth === 0) {
                if (inner.slice(start, i).trim()) items.push(parseValue(inner.slice(start, i)));
                start = i + 1;
            }
        }
        if (inner.slice(start).trim()) items.push(parseValue(inner.slice(start)));
        return items;
    }
    if (/^[+-]?\d[\d_]*(\.\d+)?$/.test(v)) return Number(v.replace(/_/g, ''));
    return v;
}

function tableAt(root: TomlTable, path: string[]): TomlTable {
    let t = root;
    for (const seg of path) {
        const next = t[seg];
        if (next && typeof next === 'object' && !Array.isArray(next)) {
            t = next;
        } else {
            const created: TomlTable = {};
            t[seg] = created;
            t = created;
        }
    }
    return t;
}

/** Parse TOML text into nested tables. Never throws. */
export function parseToml(text: string): TomlTable {
    const root: TomlTable = {};
    let current = root;
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = stripComment(lines[i]).trim();
        if (!line) continue;
        if (line.startsWith('[[')) {
            // Array tables are not needed here; park their keys in a throwaway table.
            current = {};
            continue;
        }
        if (line.startsWith('[')) {
            current = tableAt(root, splitTomlKey(line.slice(1, line.lastIndexOf(']'))));
            continue;
        }
        const eq = findAssign(line);
        if (eq < 0) continue;
        // Multi-line arrays / inline tables: keep reading until brackets balance.
        let depth = bracketDelta(line);
        while (depth > 0 && i + 1 < lines.length) {
            i++;
            const next = stripComment(lines[i]).trim();
            line += ' ' + next;
            depth += bracketDelta(next);
        }
        const keyPath = splitTomlKey(line.slice(0, eq));
        if (keyPath.length === 0) continue;
        const valueRaw = line.slice(eq + 1).trim();
        if (valueRaw.startsWith('"""') || valueRaw.startsWith("'''")) {
            const fence = valueRaw.slice(0, 3);
            let body = valueRaw.slice(3);
            while (!body.includes(fence) && i + 1 < lines.length) {
                i++;
                body += '\n' + lines[i];
            }
            body = body.slice(0, body.indexOf(fence));
            tableAt(current, keyPath.slice(0, -1))[keyPath[keyPath.length - 1]] = body;
            continue;
        }
        const target = tableAt(current, keyPath.slice(0, -1));
        target[keyPath[keyPath.length - 1]] = valueRaw.startsWith('{')
            ? valueRaw
            : parseValue(valueRaw);
    }
    return root;
}

/** Position of the `=` that separates key and value, outside quoted keys. */
function findAssign(line: string): number {
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' || c === "'") i = skipString(line, i) - 1;
        else if (c === '=') return i;
    }
    return -1;
}

/** Read a nested table (or undefined) by path. */
export function getTable(root: TomlTable, ...path: string[]): TomlTable | undefined {
    let t: TomlValue | undefined = root;
    for (const seg of path) {
        if (!t || typeof t !== 'object' || Array.isArray(t)) return undefined;
        t = (t as TomlTable)[seg];
    }
    return t && typeof t === 'object' && !Array.isArray(t) ? (t as TomlTable) : undefined;
}
