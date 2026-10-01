// CH-149-615 W&B App — verified offline release and recovery service worker
const RELEASE = Object.freeze({
  appVersion: '0.2.13-dev',
  configVersion: 16,
  releaseId: 'v0.2.13-dev-c16-r6'
});
const CACHE_PREFIX = 'wb615-release-';
const CACHE_NAME = CACHE_PREFIX + RELEASE.releaseId;
const CONTROL_CACHE = 'wb615-release-control';
const RELEASE_MARKER = './__offline_release__';
const SELECTED_MARKER = './__selected_release__';

const REQUIRED_ASSETS = Object.freeze([
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './compute.js',
  './mission.js',
  './mission-ui.js',
  './extra-crew.js',
  './accounting.js',
  './accounting-ui.js',
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

async function releaseRecord(cacheName){
  try {
    const cache=await caches.open(cacheName);
    const response=await cache.match(RELEASE_MARKER);
    if (!response) return null;
    return {...await response.json(), cacheName};
  } catch { return null; }
}

async function verifiedReleases(){
  const keys=(await caches.keys()).filter(k=>k.startsWith(CACHE_PREFIX));
  const records=(await Promise.all(keys.map(releaseRecord))).filter(Boolean);
  return records.sort((a,b)=>String(b.verifiedAt||'').localeCompare(String(a.verifiedAt||'')));
}

async function setSelectedCache(cacheName){
  const control=await caches.open(CONTROL_CACHE);
  await control.put(SELECTED_MARKER,new Response(cacheName,{headers:{'Content-Type':'text/plain'}}));
}

async function selectedCacheName(){
  try {
    const control=await caches.open(CONTROL_CACHE);
    const response=await control.match(SELECTED_MARKER);
    const selected=response ? await response.text() : '';
    if (selected && await releaseRecord(selected)) return selected;
  } catch {}
  return CACHE_NAME;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache=await caches.open(CACHE_NAME);
    try {
      for (const path of REQUIRED_ASSETS){
        const request=new Request(path,{cache:'reload'});
        const response=await fetch(request);
        if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
        await cache.put(request,response);
      }
      await cache.put(RELEASE_MARKER,new Response(JSON.stringify({
        ...RELEASE,
        cacheName:CACHE_NAME,
        assetCount:REQUIRED_ASSETS.length,
        verifiedAt:new Date().toISOString()
      }),{headers:{'Content-Type':'application/json'}}));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const releases=await verifiedReleases();
    const previous=releases.find(x=>x.cacheName!==CACHE_NAME);
    const keep=new Set([CACHE_NAME,previous?.cacheName].filter(Boolean));
    await Promise.all(releases.filter(x=>!keep.has(x.cacheName)).map(x=>caches.delete(x.cacheName)));
    // A completely verified new release becomes the normal active release.
    await setSelectedCache(CACHE_NAME);
    await self.clients.claim();
  })());
});

async function recoveryNavigation(cache){
  const response=await cache.match('./index.html');
  if (!response) return null;
  let html=await response.text();
  const banner=`
    <div id="swRecoveryBanner" style="position:sticky;top:0;z-index:99999;padding:12px 16px;background:#8a4b08;color:#fff;border-bottom:2px solid #ffbf3c;font:700 14px/1.35 system-ui;text-align:center;">
      REVERSIONARY VERSION — This is the previous verified offline release.
      <button onclick="(function(){var c=new MessageChannel();c.port1.onmessage=function(){location.reload()};navigator.serviceWorker.controller.postMessage({type:'WB615_SELECT_RELEASE',target:'latest'},[c.port2])})()" style="margin-left:12px;padding:7px 12px;border:1px solid #fff;border-radius:8px;background:#fff;color:#5b3005;font-weight:800;">Return to latest verified release</button>
    </div>`;
  html=html.replace(/<body([^>]*)>/i,`<body$1>${banner}`);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch', event => {
  if (event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if (url.origin!==self.location.origin) return;

  event.respondWith((async () => {
    const selected=await selectedCacheName();
    const cache=await caches.open(selected);
    if (event.request.mode==='navigate'){
      if (selected!==CACHE_NAME){
        const marked=await recoveryNavigation(cache);
        if (marked) return marked;
      }
      const shell=await cache.match('./index.html');
      if (shell) return shell;
    }
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if (cached) return cached;
    return fetch(event.request);
  })());
});

self.addEventListener('message', event => {
  const type=event.data?.type;
  if (type==='WB615_OFFLINE_STATUS'){
    event.waitUntil((async () => {
      const releases=await verifiedReleases();
      const selectedName=await selectedCacheName();
      const selected=(await releaseRecord(selectedName)) || (await releaseRecord(CACHE_NAME));
      const latest=await releaseRecord(CACHE_NAME);
      const previous=releases.find(x=>x.cacheName!==CACHE_NAME) || null;
      event.ports?.[0]?.postMessage({
        ready:!!selected,
        missing:selected ? [] : ['verified release'],
        appVersion:selected?.appVersion,
        configVersion:selected?.configVersion,
        assetCount:selected?.assetCount,
        selected,
        latest,
        previous,
        usingFallback:selectedName!==CACHE_NAME
      });
    })());
    return;
  }

  if (type==='WB615_SELECT_RELEASE'){
    event.waitUntil((async () => {
      const releases=await verifiedReleases();
      let target=CACHE_NAME;
      if (event.data?.target==='previous'){
        target=releases.find(x=>x.cacheName!==CACHE_NAME)?.cacheName || '';
      }
      const valid=target ? await releaseRecord(target) : null;
      if (valid) await setSelectedCache(target);
      event.ports?.[0]?.postMessage({ok:!!valid,selected:valid});
    })());
  }
});
