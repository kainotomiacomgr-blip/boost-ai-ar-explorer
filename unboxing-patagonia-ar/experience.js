const find = (id) => document.getElementById(id);
const start = find('start');
const intro = find('intro');
const hud = find('hud');
const hint = find('hint');
const warning = find('warning');
const detail = find('detail');
const next = find('next');
const viewport = find('viewport');
const aim = 'Point your camera at the photo on the left of the Patagonia slide.';
const insights = [
  'Traceability · Ask suppliers for evidence of where packaging materials come from.',
  'Material choices · Use recycled materials where feasible and size the pack to protect the product.',
  'End of life · Give customers clear instructions for recycling the packaging.',
];
const unavailable = 'AR could not load. Refresh the page or try Safari on iPhone or Chrome on Android.';
let scene;
let targetURL;
let insight = 0;

function stop(message) {
  const active = scene;
  scene = null;
  if (active) {
    const system = active.systems?.['mindar-image-system'];
    if (system?.video && system.controller && system.video.srcObject) system.stop();
    else system?.video?.srcObject?.getTracks().forEach((track) => track.stop());
    active.remove();
  }
  viewport.replaceChildren();
  if (targetURL) URL.revokeObjectURL(targetURL);
  targetURL = null;
  hud.hidden = true;
  detail.hidden = true;
  next.hidden = true;
  intro.hidden = false;
  warning.textContent = message || '';
  warning.hidden = !message;
  start.focus();
}

async function launch() {
  warning.hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) {
    stop('Open this HTTPS page in Safari or Chrome to allow camera access.');
    return;
  }
  const data = Uint8Array.from(atob(window.patagoniaImageTarget), (char) => char.charCodeAt(0));
  const packed = new Blob([data]);
  start.disabled = true;
  try {
    const stream = packed.stream().pipeThrough(new DecompressionStream('gzip'));
    targetURL = URL.createObjectURL(await new Response(stream).blob());
  } catch {
    stop('The image target could not load. Update your browser or try another device.');
    return;
  } finally {
    start.disabled = false;
  }
  scene = find('scene').content.firstElementChild.cloneNode(true);
  const active = scene;
  active.setAttribute('mindar-image', 'imageTargetSrc: ' + targetURL +
    '; autoStart: true; uiLoading: no; uiScanning: no; uiError: no;');
  active.addEventListener('arReady', () => {
    if (scene !== active) return;
    hint.textContent = aim;
    find('close').disabled = false;
    find('close').focus();
  });
  active.addEventListener('arError', () => {
    if (scene === active) stop('The camera could not start. Allow camera access or close other apps using it, then try again.');
  });
  const target = active.querySelector('[mindar-image-target]');
  target.addEventListener('targetFound', () => {
    hint.textContent = 'Packaging in view';
    detail.textContent = insights[insight];
    detail.hidden = false;
    next.hidden = false;
  });
  target.addEventListener('targetLost', () => {
    hint.textContent = aim;
    detail.hidden = true;
    next.hidden = true;
  });
  insight = 0;
  hint.textContent = 'Starting the camera…';
  intro.hidden = true;
  hud.hidden = false;
  find('close').disabled = true;
  viewport.append(active);
}
next.addEventListener('click', () => {
  insight = (insight + 1) % insights.length;
  detail.textContent = insights[insight];
});
find('close').addEventListener('click', () => stop());
window.addEventListener('pagehide', () => { if (scene) stop(); });
if (window.AFRAME?.systems['mindar-image-system'] && window.patagoniaImageTarget) {
  start.disabled = false;
  start.addEventListener('click', launch);
} else {
  warning.textContent = unavailable;
  warning.hidden = false;
}
