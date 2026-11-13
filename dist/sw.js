const CACHE='dayzero-shell-pitch-rubric-1';
const SHELL=['/','/index.html','/styles.css','/studio.css','/launch.css','/launch.mjs','/app.js','/engine.mjs','/deck-design.mjs','/sample-deck.mjs','/slide-images.mjs','/before-close-dusk.png','/before-close-handoff.png','/before-close-listing.png','/before-close-pickup.png','/before-close-log.png','/before-close-cover.png','/reloop-canteen-concept.png','/event-engine.mjs','/event-ui.mjs','/claim-engine.mjs','/preparation.mjs','/preparation-ui.mjs','/template-ui.mjs','/template-bridge.mjs','/community.mjs','/assist-ui.mjs','/assist-model.mjs'];
const VERSIONED=[
 '/app.js?v=pitch-rubric-1','/engine.mjs?v=pitch-rubric-1','/slide-images.mjs?v=visual-qa-1','/deck-design.mjs?v=pitch-rubric-1','/sample-deck.mjs?v=sample-dusk-1','/assist-ui.mjs?v=pitch-rubric-1','/assist-model.mjs?v=pitch-rubric-1','/community.mjs?v=launch-1','/template-ui.mjs?v=audit-2','/template-bridge.mjs?v=audit-2',
 ...SHELL.filter(path=>path.endsWith('.mjs')&&!path.includes('/assist-')&&!path.includes('/community.')&&!path.includes('/template-')&&!path.includes('/deck-design.')&&!path.includes('/sample-deck.')&&!path.includes('/launch.')&&!path.includes('/slide-images.')).map(path=>path+'?v=ai-1.0'),
 '/styles.css?v=ai-1.0','/studio.css?v=deck-1','/launch.css?v=draft-board-1','/launch.mjs?v=pitch-rubric-1'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...SHELL,...VERSIONED])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dayzero-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(!SHELL.includes(url.pathname)&&!url.pathname.startsWith('/vendor/'))return;
 event.respondWith(fetch(event.request,{cache:'no-store'}).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone()).catch(()=>{});}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return caches.match('/index.html');return new Response('Not available offline yet',{status:503});}));
});
