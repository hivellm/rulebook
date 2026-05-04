#!/usr/bin/env node
// Fail if any tracked *.sh file contains a CR byte (0x0d).
//
// Why: shell scripts shipped by `rulebook init` MUST have LF endings. On
// macOS/Linux, bash interprets a trailing `\r` as part of the command and
// breaks every line. A single CRLF template poisons the entire init output
// (see bug report — "rulebook init generates hook scripts with CRLF").
//
// .gitattributes already declares `*.sh text eol=lf`, but a contributor can
// still commit CRLF if they edit on Windows without renormalizing. This
// guard is the last line of defense before publish.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOTS = ['templates', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.rulebook']);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (stat.isFile() && (name.endsWith('.sh') || name.endsWith('.bash'))) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOTS.flatMap(walk);
const offenders = [];
for (const f of files) {
  const buf = readFileSync(f);
  if (buf.includes(0x0d)) {
    offenders.push(f.split(sep).join('/'));
  }
}

if (offenders.length > 0) {
  console.error('ERROR: shell scripts contain CR (CRLF) bytes — they will break on macOS/Linux:');
  for (const f of offenders) console.error('  - ' + f);
  console.error('\nFix: re-save with LF endings, or run:');
  console.error('  node -e "const fs=require(\'fs\');for(const f of process.argv.slice(1)){fs.writeFileSync(f,fs.readFileSync(f,\'utf8\').replace(/\\r\\n/g,\'\\n\').replace(/\\r/g,\'\\n\'))}" \\');
  console.error('    ' + offenders.join(' '));
  console.error('\nThe .gitattributes contract (`*.sh text eol=lf`) MUST be honored.');
  process.exit(1);
}

console.log(`check-sh-eol: ${files.length} shell script(s) clean (LF-only).`);
