/* Known browser adaptation of the approved v2.1 behavior. No field code executes. */
(function () {
  'use strict';
  if (window.hebleoCard) window.hebleoCard.destroy();
  var root = document.querySelector('.hc-card'), player = new Audio(), active, token = 0;
  var theme = root.querySelector('.hc-theme-input'), nikkud = root.querySelector('.hc-nikkud');
  var status = root.querySelector('.hc-audio-status'), state = window.hebleoInitial;
  player.preload = 'none';
  function mode(value) {
    state.mode = value;
    document.documentElement.setAttribute('data-hebleo-mode', value);
    document.body.setAttribute('data-hebleo-mode', value);
    theme.checked = value === 'dark';
  }
  mode(state.mode);
  if (nikkud) nikkud.checked = state.nikkud;
  function settingsChanged(){parent.postMessage({type:'hebleo-card-settings',mode:state.mode,nikkud:!!(nikkud&&nikkud.checked)},'*');}
  if(nikkud)nikkud.addEventListener('change',settingsChanged);
  function changed() { mode(theme.checked ? 'dark' : 'light'); settingsChanged(); }
  theme.addEventListener('change', changed);
  function stop() {
    token++; player.pause();
    try { player.currentTime = 0; } catch (_) {}
    if (active) active.setAttribute('aria-pressed','false');
    active = null;
  }
  function fail(request) {
    if (request !== token) return;
    stop();
    if (status) status.textContent = 'Audio could not start. Tap play to retry.';
  }
  function clicked(event) {
    var section = event.target.closest('.section-toggle');
    if (section && root.contains(section)) {
      var panel = document.getElementById(section.getAttribute('aria-controls'));
      if (panel && root.contains(panel)) {
        var open = section.getAttribute('aria-expanded') !== 'true';
        section.setAttribute('aria-expanded',String(open));
        var arrow = section.querySelector('.section-arrow');
        if (arrow) arrow.textContent = open ? '▾' : '▸';
        panel.hidden = !open;
      }
      return;
    }
    var button = event.target.closest('.hc-play[data-audio]');
    if (!button || !root.contains(button)) return;
    stop(); var request = token; active = button;
    button.setAttribute('aria-pressed','true');
    if (status) status.textContent = '';
    player.src = button.getAttribute('data-audio');
    try { var promise = player.play(); if (promise) promise.catch(function(){fail(request);}); } catch (_) { fail(request); }
  }
  function error() { fail(token); }
  function visibility() { if (document.hidden) stop(); }
  function height() {
    parent.postMessage({type:'hebleo-card-height',height:Math.ceil(document.body.getBoundingClientRect().height)},'*');
  }
  var observer = new ResizeObserver(height); observer.observe(document.body);
  root.addEventListener('click',clicked);
  player.addEventListener('ended',stop); player.addEventListener('error',error);
  window.addEventListener('pagehide',stop); document.addEventListener('visibilitychange',visibility);
  window.hebleoCard = {get mode(){return state.mode;}, get nikkud(){return !!(nikkud && nikkud.checked);},destroy:function(){
    stop(); observer.disconnect(); player.removeAttribute('src'); player.load();
    if(nikkud)nikkud.removeEventListener('change',settingsChanged);
    root.removeEventListener('click',clicked); theme.removeEventListener('change',changed);
    player.removeEventListener('ended',stop); player.removeEventListener('error',error);
    window.removeEventListener('pagehide',stop); document.removeEventListener('visibilitychange',visibility);
  }};
  height();
}());
