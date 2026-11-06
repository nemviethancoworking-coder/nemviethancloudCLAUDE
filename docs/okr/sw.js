/* Service worker của OKR Weekly (v19).
   - Tệp của app (HTML, JS, biểu tượng): ưu tiên MẠNG, luôn lấy bản mới nhất; chỉ khi mất mạng mới dùng bản đã lưu
     → app không bao giờ kẹt ở phiên bản cũ sau mỗi lần cập nhật.
   - Thư viện ngoài (Tailwind, phông chữ): dùng bản đã lưu cho mở nhanh, đồng thời cập nhật ngầm.
   - Không đụng tới API máy chủ dữ liệu (khác tên miền) và mọi yêu cầu không phải GET: dữ liệu luôn đi thẳng lên máy chủ. */
const VER = 'okr-v19';
const SHELL = VER + '-shell', CDN = VER + '-cdn';
const PRECACHE = ['./', 'index.html', 'work.js?v=19', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VER)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin === location.origin) e.respondWith(networkFirst(req));
  else if(CDN_HOSTS.includes(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req){
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  } catch(err){
    const hit = await cache.match(req) || (req.mode === 'navigate' ? (await cache.match('index.html')) || (await cache.match('./')) : null);
    if(hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req){
  const cache = await caches.open(CDN);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}
