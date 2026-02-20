self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("ravencounty-v1").then(cache=>{
      return cache.addAll([
        "index.html",
        "style.css",
        "app.js",
        "assets/ravencounty.png"
      ]);
    })
  );
});






