# json-field-shape-audit

Find field type drift and missing fields across JSONL records.

The audit reports:

- a field observed with multiple non-null types (`mixed-types`)
- a field observed as both null and a non-null type (`nullable-field`)
- a field absent from one or more records (`missing-field`)

## Run

```bash
npx --yes github:b69ca/json-field-shape-audit events.jsonl
npx --yes github:b69ca/json-field-shape-audit events.jsonl --json --fail
cat events.jsonl | npx --yes github:b69ca/json-field-shape-audit - --path /user/id
```

## Options

```text
--path /pointer  include only this field; repeat to select several
--json           emit machine-readable JSON
--fail           exit 1 when findings exist
--help           print usage
```

Input is one JSON object per nonblank line. With no file, read stdin. Invalid JSON or non-object records are errors. Exit codes: 0 for a completed audit, 1 for findings with `--fail`, 2 for input or argument errors.

Paths use JSON Pointer escaping (`~0` for `~`, `~1` for `/`), with `*` for array items. Literal `*` keys share the same path as array wildcards. Containers are counted too. Array observations count each item, but record presence counts a path at most once per record. Missing means absent anywhere in that record: empty arrays and missing parents make descendant paths absent. It does not test whether every item in an array has the field. Fields absent from every record cannot be discovered, even with `--path`.

Null-only fields are consistent. Null plus another type is nullable; multiple non-null types are mixed. A field can have several findings. Missing and nullable fields may be intentional; the report is evidence of observed shape variation, not a schema validator.

Records are processed locally. Reports contain paths and counts, never field values. Field names may still contain sensitive information. Input records are held in memory.

## Example

```jsonl
{"user":{"id":1,"name":"Ada"}}
{"user":{"id":"2"}}
```

Reports `mixed-types` at `/user/id` and `missing-field` at `/user/name`.

## Library

```js
import { analyze } from 'json-field-shape-audit';
const report = analyze([{ id: 1 }, { id: '2' }], { paths: ['/id'] });
console.log(report.findingCount); // 1
```

Node.js 20 or newer. No runtime dependencies.

## Development

```bash
npm ci
npm run check
```

## License

MIT
