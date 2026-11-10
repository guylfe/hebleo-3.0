import {mountConjugation} from './view.js';
for (const host of document.querySelectorAll('[data-conjugation-host]')) {
  if(host.dataset.mounted)continue;
  host.dataset.mounted='true';
  const root=host.querySelector('[data-conjugation-root]');
  try {mountConjugation(root,{catalog:JSON.parse(host.querySelector('[data-conjugation-catalog]').textContent),platform:'wordpress',ownerKey:'wordpress:'+host.dataset.conjugationOwner,storageKey:'hebleo-conjugation-preferences-v1-'+host.dataset.conjugationOwner});}
  catch {root.textContent='Practice content is unavailable. Please try again later.';}
}
