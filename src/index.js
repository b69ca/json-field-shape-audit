const pointer = parts => parts.length ? `/${parts.map(x => String(x).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` : '';
const kind = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
function visit(value, parts, found) {
  const path = pointer(parts), types = found.get(path) || new Map(), type = kind(value);
  types.set(type, (types.get(type) || 0) + 1); found.set(path, types);
  if (Array.isArray(value)) value.forEach(item => visit(item, [...parts, '*'], found));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, [...parts, key], found));
}
export function analyze(rows, { paths = [] } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('at least one JSON record is required');
  if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('each JSON record must be an object');
  const wanted = new Set(paths), stats = new Map();
  for (const row of rows) {
    const found = new Map(); visit(row, [], found);
    for (const [path, types] of found) {
      if (!path || (wanted.size && !wanted.has(path))) continue;
      const s = stats.get(path) || { path, recordsPresent: 0, observations: 0, types: {} };
      s.recordsPresent++;
      for (const [type, count] of types) { s.observations += count; s.types[type] = (s.types[type] || 0) + count; }
      stats.set(path, s);
    }
  }
  const fields = [...stats.values()].map(s => {
    const missingRecords = rows.length - s.recordsPresent, findings = [];
    if (Object.keys(s.types).filter(type => type !== 'null').length > 1) findings.push('mixed-types');
    if (s.types.null && Object.keys(s.types).length > 1) findings.push('nullable-field');
    if (missingRecords) findings.push('missing-field');
    return { ...s, missingRecords, findings };
  }).sort((a, b) => a.path.localeCompare(b.path));
  return { recordCount: rows.length, fieldCount: fields.length, findingCount: fields.reduce((n, f) => n + f.findings.length, 0), fields };
}
