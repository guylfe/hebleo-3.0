import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export async function runtimeFromArgs() {
  const args = process.argv.slice(2), index = args.indexOf('--runtime');
  if (index < 0 || !args[index + 1]) throw new Error('Supply --runtime <isolated checkout>');
  const directory = resolve(args[index + 1]);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  const store = await import(pathToFileURL(resolve(directory, 'src/store.js')));
  return { ...store, directory, commit };
}
export const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverseKeys(v)])) : value;
export const dump = store => JSON.stringify(['kv', 'learners', 'events', 'revisions'].map(table => store.db.prepare('SELECT * FROM ' + table + ' ORDER BY 1').all()));
