#!/usr/bin/env node
/**
 * Bundle the MCP server into one file, dist/mcp/rulebook-server.bundle.js
 * (F-017: importing the MCP SDK's ~200 modules is 80 % of server startup).
 * The fast path (`rulebook mcp init --fast`) launches the bundle when it is
 * present; the `rulebook-mcp` bin and the generated npx entry are unchanged.
 *
 * Modules locate package files (package.json, templates/) relative to their
 * own `import.meta.url`. Each module's `import.meta.url` is rewritten to the
 * URL its unbundled dist/ copy would have, so those lookups resolve exactly as
 * they do in the unbundled build.
 */
import { build } from 'esbuild';
import path from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const outfile = path.join(root, 'dist', 'mcp', 'rulebook-server.bundle.js');

const distImportMetaUrl = {
    name: 'dist-import-meta-url',
    setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/].*\.ts$/ }, async (args) => {
            const source = await readFile(args.path, 'utf8');
            if (!source.includes('import.meta.url')) return undefined;
            const distFile = path
                .relative(path.join(srcDir, 'mcp'), args.path)
                .replace(/\\/g, '/')
                .replace(/\.ts$/, '.js');
            const url = `new URL(${JSON.stringify(distFile)}, import.meta.url).href`;
            return { contents: source.replaceAll('import.meta.url', url), loader: 'ts' };
        });
    },
};

await build({
    entryPoints: [path.join(srcDir, 'mcp', 'rulebook-server.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    minify: true,
    // Bundled CommonJS dependencies still call require() at runtime (Node
    // built-ins, ajv's runtime helpers); give the ESM bundle a real one.
    banner: {
        js: "import { createRequire as __rbCreateRequire } from 'module'; const require = __rbCreateRequire(import.meta.url);",
    },
    plugins: [distImportMetaUrl],
    logLevel: 'warning',
});
console.log(`MCP bundle: ${path.relative(root, outfile)}`);
