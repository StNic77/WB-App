// CH-149-615 W&B App — verified offline release service worker
// Keep this release record synchronized with APP_VERSION in persist.js and
// AC.meta.configVersion in config.js whenever a controlled release is made.

const RELEASE = Object.freeze({
  appVersion: '0.2.8',
  configVersion: 12,
  releaseId: 'v0.2.8-c12-r1'
});
const CACHE_PREFIX = 'wb615-release-';
const CACHE_NAME = CACHE_PREFIX + RELEASE.releaseId;
const RELEASE_MARKER = './__offline_release__';

// Every file needed for calculation, configuration, display and PDF output.
// Installation fails if any one of these files cannot be fetched and cached.
const REQUIRED_ASSETS = Object.freeze([
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './compute.js',
  './pdf.js',
  './editor.js',
  './mcdu.js',
  './persist.js',
  './manifest.json',
  './jspdf.umd.min.js',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/apple-touch-icon.png',
  './images/Schematic_SAR_Crew.png',
  './images/Schematic_Pax_Seats.png',
  './images/SAR_3_Pax.png',
  './images/SAR_10_Pax.png',
  './images/CASEVAC.png',
  './images/Transport.png'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      for (const path of REQUIRED_ASSETS){
        const request = new Request(path, {cache:'reload'});
        const response = await fetch(request);
        if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
        await cache.put(request, response);
      }
      await cache.put(RELEASE_MARKER, new Response(JSON.stringify({
        ...RELEASE,
        cacheName: CACHE_NAME,
        assetCount: REQUIRED_ASSETS.length,
        verifiedAt: new Date().toISOString()
      }), {headers:{'Content-Type':'application/json'}}));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Remove obsolete release caches only after the new complete cache exists.
    // The immediately previous verified release is retained for later recovery work.
    const keys = (await caches.keys()).filter(k => k.startsWith(CACHE_PREFIX));
    const previous = keys.filter(k => k !== CACHE_NAME).slice(-1);
    const keep = new Set([CACHE_NAME, ...previous]);
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (cached) return cached;

    // A navigation to a route below the app scope still opens the cached shell.
    if (event.request.mode === 'navigate'){
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }

    // Non-release same-origin files may use the network, but are never inserted
    // into the verified release cache.
    return fetch(event.request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'WB615_OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    let ready = false;
    let missing = [];
    try {
      const cache = await caches.open(CACHE_NAME);
      const checks = await Promise.all(REQUIRED_ASSETS.map(async path => ({
        path,
        found: !!(await cache.match(path, {ignoreSearch:true}))
      })));
      missing = checks.filter(x => !x.found).map(x => x.path);
      ready = missing.length === 0 && !!(await cache.match(RELEASE_MARKER));
    } catch (error) {
      missing = ['offline cache unavailable'];
    }
    event.ports?.[0]?.postMessage({ready, missing, ...RELEASE, assetCount:REQUIRED_ASSETS.length});
  })());
});
