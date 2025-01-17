// @ts-nocheck
import fs from 'fs';

const [datafn] = process.argv.slice(2);
const stats = { kv: { rows: 0, chars: 0 } };
const data = JSON.parse(fs.readFileSync(datafn));
for (const [vatID, vat] of Object.entries(data)) {
  stats.kv.rows += vat.stats.kv.rows;
  stats.kv.chars += vat.stats.kv.chars;
}
console.log(JSON.stringify(stats));
