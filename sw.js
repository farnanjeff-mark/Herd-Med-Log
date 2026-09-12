// Cattle Meds — app shell offline cache
// Purpose: let the app itself open with zero signal, by keeping a saved copy
// of the page and the outside libraries it depends on. This does NOT cache
// or interfere with Supabase data calls — those are handled separately by
// the app's own offline data logic.

const SHELL_CACHE = 'cattle-meds-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name.startsWith('cattle-meds-shell-') && name !== SHELL_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

function shouldHandle(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (request.mode === 'navigate') return true;          // the app page itself
  if (url.hostname === 'cdnjs.cloudflare.com') return true; // icon font + library files
  if (url.pathname.endsWith('sw.js')) return false;
  return false; // everything else (including all Supabase calls) passes straight through untouched
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!shouldHandle(request)) return; // not ours to handle — let the browser do its normal thing

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          throw new Error('Offline and no cached copy available for ' + request.url);
        });
      })
  );
});
