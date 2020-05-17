'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "index.html": "c9a3068fbb4d5585881d28bb442c5f16",
"/": "c9a3068fbb4d5585881d28bb442c5f16",
"main.dart.js": "1b7d0b6918818d131a4cbc1f48f51855",
"favicon.png": "97cd8d28580c8195dc8c02ea84dc19b8",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "39ea4a7663dac93992ee709416f1ea60",
"assets/LICENSE": "ab1546f3094041a3130e53f8c150697d",
"assets/AssetManifest.json": "f7e9cc59e84379755fca4f4eccbce474",
"assets/FontManifest.json": "c754bb2b01853f812083eb2d8ce3cc2a",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "115e937bb829a890521f72d2e664b632",
"assets/fonts/SF-Compact-Display-Regular.ttf": "498d37835e4d7d3ebeb62b2ab9f3afdc",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/imagens/foto1.png": "2dd5b046df4203c888bd01200620b45f",
"assets/imagens/googleplay.png": "380a265bcf249a6f23b418bb1ba0ee12",
"assets/imagens/icon.png": "97cd8d28580c8195dc8c02ea84dc19b8",
"assets/imagens/foto3.png": "2324fbbe8e8e28ed83ce927a3a83487a",
"assets/imagens/foto2.png": "93c1ed1c1b983fcc1c1a0b7dbe126850",
"assets/imagens/instagram.png": "a482e06d30a3eea53f45884b656c1685",
"assets/imagens/foto4.png": "f1cb6d3a53a0bb43052639d97936f97e",
"assets/imagens/logoimg.png": "f2c604f4c5849b40bccfb527efb7fa40",
"assets/imagens/appstore.png": "8264aa983dd987345c98602fbd81f18a",
"assets/imagens/twitter.png": "966ccef499145bec62b9777b4551c693",
"assets/imagens/promo.svg": "042e4e0e6651aaa829118e4f56d508fe",
"assets/imagens/facebook.png": "44f9f4fcb441f2cf2e81bfe7e2b55c24",
"assets/imagens/logotexto.png": "92e408d18ae218aafca5c93c7eb92c0a"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
"/",
"index.html",
"assets/LICENSE",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(CORE);
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // If the URL is not the the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

