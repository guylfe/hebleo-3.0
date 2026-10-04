import {audioURL} from '../ux.js';
import {escapeHTML as e} from './editor-fields.js';

// References are supplied by the author media adapter. Preserve opaque fields;
// selection neither uploads bytes nor invents immutable identity or approval.
export function renderMediaPicker(assets) {
  return `<section class="studio-media-picker"><h3>Choose supplied media</h3><p>Select an existing reference. Uploading and immutable media storage require the author media service.</p>${assets.length ? assets.map((asset, index) => {
    const url = typeof asset === 'string' ? asset : asset.url;
    const pinned = Boolean(asset?.assetId && asset?.revisionId && asset?.hash);
    return `<article><h4>${e(asset?.title || asset?.assetId || 'Media reference')}</h4><p>${e(url || '(no playback URL)')}</p><p>${pinned ? `Supplied asset ${e(asset.assetId)} · revision ${e(asset.revisionId)} · hash ${e(asset.hash)}` : 'Unpinned legacy reference: historical bytes are not guaranteed.'}</p><button type="button" data-select-media="${index}"${audioURL(url) ? '' : ' disabled'}>Select reference</button></article>`;
  }).join('') : '<p>No media references supplied.</p>'}<p data-media-status role="status"></p></section>`;
}
export function mountMediaPicker(container, {assets, onSelected}) {
  const frozen = structuredClone(assets), controller = new container.ownerDocument.defaultView.AbortController();
  let busy = false;
  container.innerHTML = renderMediaPicker(frozen);
  container.addEventListener('click', async event => {
    const button = event.target.closest('[data-select-media]');
    if (!button || button.disabled || busy) return;
    const selected = frozen[Number(button.dataset.selectMedia)];
    if (!audioURL(typeof selected === 'string' ? selected : selected?.url)) return;
    const buttons = [...container.querySelectorAll('[data-select-media]')], disabled = buttons.map(el => el.disabled);
    busy = true; buttons.forEach(el => el.disabled = true);
    try {
      await onSelected(structuredClone(selected));
      if (!controller.signal.aborted) container.querySelector('[data-media-status]').textContent = 'Reference selected for the author draft.';
    } catch (error) {if (!controller.signal.aborted) container.querySelector('[data-media-status]').textContent = error.message;}
    finally {busy = false; buttons.forEach((el,i) => el.disabled = disabled[i]);}
  }, {signal:controller.signal});
  return () => controller.abort();
}
