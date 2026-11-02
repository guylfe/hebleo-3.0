import {parseFragment, serialize} from 'parse5';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const approved = JSON.parse(readFileSync(new URL('./approved-templates.json', import.meta.url)));
const behavior = readFileSync(new URL('./behavior.js', import.meta.url), 'utf8');
export const FIELD_NAMES = Object.freeze(['SourceId','Hebrew','English','Forms','Notes','Grammar','Source','Audio','HebrewNikkud']);
export const DIRECTIONS = Object.freeze(['he-en','en-he']);
export const PACKAGE_SHA256 = '597c2fb3c78591a0c377216ab6668b5408a48a3f5f0a66b57fbb225122dd4e2a';
export const templateSha256 = createHash('sha256').update(JSON.stringify(approved)).digest('hex');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags = new Set('section div span bdi b strong i em u s br p h2 h3 details summary table caption thead tbody tr th td ul ol li abbr button svg circle path audio a'.split(' '));
const attrs = new Set('class id dir lang title role hidden tabindex type aria-label aria-hidden aria-pressed aria-expanded aria-controls scope colspan rowspan viewBox cx cy r d version preload'.toLowerCase().split(' '));
const basename = n => typeof n === 'string' && /^[a-zA-Z0-9_-]+\.(mp3|png)$/.test(n);

export function validateNote(note) {
  if (!note || !/^mf-\d{6}$/.test(note.id) || note.fields?.SourceId !== note.id) throw Error('Invalid source identity');
  if (Object.keys(note.fields).sort().join('|') !== [...FIELD_NAMES].sort().join('|') || FIELD_NAMES.some(k=>typeof note.fields[k] !== 'string')) throw Error('Expected exact nine string fields');
}

export function createRenderer({mediaManifest, mediaBaseUrl}) {
  const base = new URL(mediaBaseUrl);
  if (!['https:','http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw Error('Expected absolute HTTP(S) media directory URL without credentials/query/fragment');
  const media = new Set();
  for (const item of mediaManifest) {
    if (!basename(item.file) || !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes < 1 || media.has(item.file)) throw Error('Invalid/duplicate media manifest');
    media.add(item.file);
  }
  function mediaUrl(name) {
    if (!basename(name) || !media.has(name)) throw Error('Unknown or unsafe media: ' + name);
    return new URL(name, base).href;
  }
  function sanitize(html) {
    const tree = parseFragment(html);
    function clean(parent) {
      parent.childNodes = (parent.childNodes || []).flatMap(node => {
        if (node.nodeName === '#text') return [node];
        if (!tags.has(node.tagName)) return [];
        // Links are retained as inert text containers; no navigation from fields.
        node.attrs = node.attrs.filter(a => !a.namespace && (attrs.has(a.name.toLowerCase()) || a.name === 'data-audio'));
        node.attrs = node.attrs.map(a => a.name === 'data-audio' ? {...a,value:mediaUrl(a.value)} : a);
        clean(node);
        return [node];
      });
    }
    // Audio has no independent autoplay: all playback uses the one managed player.
    // Its hidden source nodes are redundant; supplied replay buttons are preserved.
    clean(tree);
    return serialize(tree);
  }
  return {
    mediaUrl,
    sanitize,
    renderCard({note, direction, face, settings = {}}) {
      validateNote(note);
      if (!DIRECTIONS.includes(direction) || !['front','back'].includes(face)) throw Error('Invalid direction/face');
      if (settings.mode !== undefined && !['light','dark'].includes(settings.mode)) throw Error('Invalid theme');
      if (settings.nikkud !== undefined && typeof settings.nikkud !== 'boolean') throw Error('Invalid Nikkud setting');
      const fields = Object.fromEntries(FIELD_NAMES.map(k=>[k,sanitize(note.fields[k])]));
      fields.SourceId = escape(note.id);
      fields.Audio = sanitize(note.fields.Audio.replace(/\[sound:([^\]]+)\]/g, (_,name) => '<button class="hc-play" type="button" data-audio="' + escape(name) + '" aria-label="Replay base audio" aria-pressed="false"><svg class="playImage" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"></circle><path d="M56.502,32.301l-37.502,20.101l0.329,-40.804l37.173,20.703Z"></path></svg></button>'));
      const template = approved.templates[DIRECTIONS.indexOf(direction)][face === 'front' ? 'qfmt':'afmt'].replace(/<script>[\s\S]*?<\/script>/g,'');
      let body = template.replace(/\{\{(\w+)\}\}/g, (_,key) => fields[key] ?? '');
      body = body.replace(/src="(_hebleo-logo-(?:blue|white)\.png)"/g, (_,name)=>'src="'+escape(mediaUrl(name))+'"');
      const mode = settings.mode || 'light';
      const init = 'window.hebleoInitial=' + JSON.stringify({mode,nikkud:!!settings.nikkud}) + ';';
      const script = init + behavior;
      const scriptHash = createHash('sha256').update(script).digest('base64');
      // Inline style is safe: fields cannot supply style attributes or style elements.
      const csp = "default-src 'none'; script-src 'sha256-"+scriptHash+"'; style-src 'unsafe-inline'; img-src "+base.origin+"; media-src "+base.origin+"; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
      return '<!doctype html><html lang="en" data-hebleo-mode="'+mode+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+escape(csp)+'"><title>Hebleo vocabulary card</title><style>'+approved.css+'\nbody.card{min-height:0}</style></head><body class="card" data-hebleo-mode="'+mode+'">'+body+'<script>'+script+'</script></body></html>';
    }
  };
}

export function buildRuntime({vocabulary, templates, mediaManifest, mediaBaseUrl, settings = {}}) {
  if (vocabulary.schemaVersion !== 1 || vocabulary.packageSha256 !== PACKAGE_SHA256 || JSON.stringify(vocabulary.fields) !== JSON.stringify(FIELD_NAMES)) throw Error('Unexpected source package');
  if (JSON.stringify(templates) !== JSON.stringify(approved)) throw Error('Unapproved templates/CSS');
  const renderer = createRenderer({mediaManifest,mediaBaseUrl});
  const seen = new Set();
  const notes = vocabulary.notes.map(note => {
    validateNote(note);
    if (seen.has(note.id)) throw Error('Duplicate SourceId');
    seen.add(note.id);
    return structuredClone(note);
  });
  const cards = notes.flatMap(note => DIRECTIONS.map(direction => ({
    id:note.id+':'+direction, sourceId:note.id, direction,
    front:renderer.renderCard({note,direction,face:'front',settings}),
    back:renderer.renderCard({note,direction,face:'back',settings})
  })));
  return {schemaVersion:1,adapterVersion:'1.0.0',packageSha256:PACKAGE_SHA256,templateSha256,modelId:approved.modelId,mediaBaseUrl:new URL(mediaBaseUrl).href,settings:structuredClone(settings),raw:structuredClone(vocabulary),mediaManifest:structuredClone(mediaManifest),cards};
}
