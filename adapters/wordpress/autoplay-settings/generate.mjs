import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const sha = value => createHash('sha256').update(value).digest('hex');
export const baselines = {
  'templates/card_loader.php': '6752fc3cde95ae8bda229638fffaee428ee1f62cf0eabe80ccb8552495a8e685',
  'archive-decks.php': 'c4e7a254b3161217b87887cb803c4d97060df12201e6c5540dceaa2364826def'
};
export function generate(rel, bytes) {
  if (sha(bytes) !== baselines[rel]) throw Error('Unreviewed autoplay baseline: ' + rel);
  let text = bytes.toString('utf8');
  const before = rel === 'templates/card_loader.php'
    ? "    $autoplay_audio = isset($_POST['autoplay_audio']) ? 1 : 0;"
    : "${settings.autoplay_audio ? 'checked' : ''}";
  const after = rel === 'templates/card_loader.php' ? [
    '    // Older checkbox forms omit unchecked values; the current client sends 0 or 1.',
    "    $autoplay_value = array_key_exists('autoplay_audio', $_POST) ? $_POST['autoplay_audio'] : 0;",
    "    if (!in_array($autoplay_value, [0, 1, '0', '1', false, true, 'on'], true)) {",
    "        wp_send_json_error('Invalid autoplay setting');",
    '    }',
    "    $autoplay_audio = in_array($autoplay_value, [1, '1', true, 'on'], true) ? 1 : 0;"
  ].join(text.includes('\r\n') ? '\r\n' : '\n') : "${Number(settings.autoplay_audio) === 1 ? 'checked' : ''}";
  if (text.split(before).length !== 2) throw Error('Autoplay anchor changed: ' + rel);
  return text.replace(before, after);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw Error('Usage: node generate.mjs LIVE_SNAPSHOT OUTPUT');
  const manifest = {};
  for (const rel of Object.keys(baselines)) {
    const before = fs.readFileSync(path.join(input, rel)), after = generate(rel, before);
    fs.mkdirSync(path.dirname(path.join(output, rel)), {recursive: true});
    fs.writeFileSync(path.join(output, rel), after);
    manifest[rel] = {before: sha(before), after: sha(after)};
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
