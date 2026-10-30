// IIHQ: cache ONLY public icon assets and the offline explanation.
// NEVER cache user sessions, pages containing account data, Supabase APIs or broker responses.
// Paper executor status interface refresh: 30 October 2026.
const CACHE='iihq-public-assets-v1';
const PUBLIC=['./offline.html','./icons/iihq-icon-192.png','./icons/iihq-icon-512.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iihq-public-assets-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    // Always re-fetch, so private account content is never served from an offline cache.
    event.respondWith(fetch(req).catch(()=>caches.match('./offline.html')));
  }
});

