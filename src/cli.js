#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { analyze } from './index.js';
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: json-field-shape-audit [FILE|-] [--path /pointer]... [--json] [--fail]'); process.exit(0); }
try {
  let file = '-', hasFile = false; const paths = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--path') { const path = args[++i]; if (!path?.startsWith('/')) throw new Error('--path requires a JSON pointer beginning with /'); paths.push(path); }
    else if (['--json', '--fail'].includes(arg)) continue;
    else if (arg.startsWith('-') && arg !== '-') throw new Error(`unknown option: ${arg}`);
    else { if (hasFile) throw new Error('only one input file is supported'); file = arg; hasFile = true; }
  }
  const input = file === '-' ? process.stdin : createReadStream(file), rl = createInterface({ input, crlfDelay: Infinity }), rows = [];
  let lineNumber = 0;
  for await (const line of rl) { lineNumber++; if (!line.trim()) continue; try { rows.push(JSON.parse(line)); } catch { throw new Error(`line ${lineNumber}: invalid JSON`); } }
  const report = analyze(rows, { paths });
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else { console.log(`${report.recordCount} records, ${report.fieldCount} fields, ${report.findingCount} findings`); for (const f of report.fields) console.log(`${f.path}\t${f.findings.join(',') || 'consistent'}\t${Object.entries(f.types).map(([t, n]) => `${t}:${n}`).join(',')}\tmissing:${f.missingRecords}`); }
  if (args.includes('--fail') && report.findingCount) process.exitCode = 1;
} catch (error) { console.error(`json-field-shape-audit: ${error.message}`); process.exitCode = 2; }
