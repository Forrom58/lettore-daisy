// Service worker del Lettore DAISY
// - I file dell'app vengono salvati per l'uso senza internet.
// - Per i file dell'app si prova prima la rete (così gli aggiornamenti arrivano subito),
//   e se manca la connessione si usa la copia salvata.
// Quando si pubblica una nuova versione, cambiare il numero qui sotto.
const CACHE_NAME = 'daisy-offline-v10';

const APP_FILES = [
    './',
    'index.html',
    'manifest.json',
    'icona_app_daisy.svg',
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png'
];

const CDN_FILES = [
    'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Un file mancante non deve bloccare l'installazione
        await Promise.all(APP_FILES.map(f => cache.add(f).catch(() => {})));
        await Promise.all(CDN_FILES.map(u =>
            fetch(u, { mode: 'no-cors' }).then(r => cache.put(u, r)).catch(() => {})
        ));
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(req);
            if (response && (response.ok || response.type === 'opaque')) {
                cache.put(req, response.clone()).catch(() => {});
            }
            return response;
        } catch (err) {
            const cached = await cache.match(req, { ignoreSearch: true });
            if (cached) return cached;
            if (req.mode === 'navigate') {
                const page = await cache.match('index.html') || await cache.match('./');
                if (page) return page;
            }
            throw err;
        }
    })());
});
