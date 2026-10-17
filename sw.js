// Service worker : ouverture hors connexion + réception des notifications.
// Pensez à changer le numéro de VERSION quand vous modifiez l'appli, pour que les téléphones prennent la nouvelle version.
const VERSION = "nanous-v1";
const SHELL = [
  "./", "index.html", "app.js", "store.js", "schedule.js", "config.js", "tasks-default.js",
  "manifest.json", "vendor/supabase.js", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Fichiers de l'appli et polices : réseau d'abord (pour avoir les mises à jour), sinon le cache.
// Les échanges avec Supabase ne sont jamais mis en cache.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const mine = url.origin === location.origin;
  const fonts = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (e.request.method !== "GET" || (!mine && !fonts)) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Notification envoyée chaque matin par le script de rappels
self.addEventListener("push", e => {
  let data = {};
  try { data = e.data.json(); } catch { data = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(
    self.registration.showNotification(data.title || "Les Nanous", {
      body: data.body || "",
      tag: data.tag,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: "./" },
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
