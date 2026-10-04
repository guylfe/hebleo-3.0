// Extracts exact masterfile rows from a local CSV export into a provenance JSON file.
// Read-only: never writes the source. The CSV snapshot itself stays outside the repository.
//
// Usage: node docs/content-provenance/tools/extract-source-rows.mjs <snapshot.csv> <lesson[,lesson...]> > out.json
//
// rowSha256 = sha256(UTF-8 JSON.stringify(all 30 cells of the row, in column order)), no Unicode
// normalization, CR removed by the parser (CSV line breaks inside cells are LF in the export).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

if (process.argv[1]?.endsWith('extract-source-rows.mjs')) {
  const [csvPath, lessonArg] = process.argv.slice(2);
  if (!csvPath || !lessonArg) {
    console.error('usage: extract-source-rows.mjs <snapshot.csv> <lesson[,lesson...]>');
    process.exit(2);
  }
  const raw = readFileSync(csvPath);
  const [header, ...data] = parseCsv(raw.toString('utf8'));
  const lessons = new Set(lessonArg.split(','));
  const rows = data
    .filter((cells) => lessons.has(cells[header.indexOf('Lesson')]))
    .map((cells) => ({
      ordinal: Number(cells[0]),
      rowSha256: sha256(JSON.stringify(cells)),
      cells: Object.fromEntries(header.map((name, i) => [name, cells[i]]).filter(([, v]) => v !== '')),
    }));
  console.log(JSON.stringify({ snapshotSha256: sha256(raw), header, rows }, null, 2));
}
