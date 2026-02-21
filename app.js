/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

const OFFSET_X = 64;   // X +64
const OFFSET_Z = 65;   // Z +65

let currentUser = null;
let map;
let gridLayer = null;
let measurePoints = [];
let placingMarker = false;
let placingTown = false;

let publicMarkers = [];
let publicTowns = [];
let privateMarkers = JSON.parse(localStorage.getItem("privateMarkers") || "[]");

const users = [
  {username:"Kingosp4de", password:"BlaiseKey2026", role:"admin"},
  {username:"Xzyus", password:"HitByAAda4x4", role:"mod"}
];

/* ================= MAP INIT ================= */

function initMap() {
  map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 4
  });

  const bounds = [[0, 0], [MAP_SIZE, MAP_SIZE]];
  L.imageOverlay("assets/ravencounty.png", bounds).addTo(map);
  map.fitBounds(bounds);

  map.on("mousemove", updateCoords);
  map.on("click", handleMapClick);
  map.on("contextmenu", handleRightClick);

  // Load all layers and wait for them to finish
  Promise.all([
    loadPrivateMarkers(),
    loadPublicMarkers(),
    loadPublicTowns()
  ]).finally(() => {
    // All layers loaded (or failed), hide the loading screen
    document.getElementById("loadingScreen").style.display = "none";
  });
}

/* ================= COORDS ================= */

function updateCoords(e) {
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function centerMap() {
  map.setView([ORIGIN, ORIGIN], 0);
}

/* ================= SEARCH ================= */

function searchCoords() {
  // Get values from the X and Z input fields
  const xInput = document.getElementById("searchX").value;
  const zInput = document.getElementById("searchZ").value;

  // Convert to numbers
  const x = parseInt(xInput.trim());
  const z = parseInt(zInput.trim());

  // Validate inputs
  if (isNaN(x) || isNaN(z)) {
    return alert("Please enter valid numbers for X and Z.");
  }

  // Apply offsets to convert to map coordinates
  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = (x - OFFSET_X) + ORIGIN;

  // Center the map on these coordinates
  map.setView([lat, lng], 2);

  // Optional: briefly highlight the searched point
  const searchMarker = L.circleMarker([lat, lng], {
    radius: 10,
    color: "magenta",
    fillColor: "magenta",
    fillOpacity: 0.7
  }).addTo(map);

  // Remove the temporary marker after 3 seconds
  setTimeout(() => map.removeLayer(searchMarker), 120000);
}
/* ================= GRID ================= */

function toggleGrid() {
  if(gridLayer) {
    map.removeLayer(gridLayer);
    gridLayer = null;
    return;
  }

  gridLayer = L.layerGroup();
  const size = 32;

  for(let i=-ORIGIN; i<=ORIGIN; i+=size) {
    const p = i + ORIGIN;
    gridLayer.addLayer(L.polyline([[0,p],[MAP_SIZE,p]]));
    gridLayer.addLayer(L.polyline([[p,0],[p,MAP_SIZE]]));
  }

  gridLayer.addTo(map);
}

/* ================= MEASURE ================= */

function startMeasure() {
  measurePoints = [];
  alert("Click two points.");
}

function handleMapClick(e) {
  if(placingMarker) {
    placingMarker = false;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(placingTown) {
    placingTown = false;
    promptTownDetails(e.latlng);
    return;
  }

  if(measurePoints.length === 1) {
    measurePoints.push(e.latlng);

    const a = measurePoints[0];
    const b = measurePoints[1];

    const dx = Math.round(b.lng - a.lng);
    const dz = Math.round(a.lat - b.lat);
    const dist = Math.sqrt(dx*dx + dz*dz).toFixed(2);

    alert(`Distance: ${dist} blocks`);
    measurePoints = [];
  } else if(measurePoints.length === 0) {
    measurePoints.push(e.latlng);
  }
}

/* ================= RIGHT CLICK BLOCK LOCATION ================= */

function handleRightClick(e) {
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  alert(`Block Location:\nX: ${x}\nZ: ${z}`);
}

/* ================= MARKERS ================= */

function startMarkerPlacement() {
  if(!currentUser) return alert("Login first.");
  placingMarker = true;
  alert("Click map to place marker.");
}

function promptMarkerDetails(latlng) {
  const type = prompt("Type: house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;

  const name = prompt("Marker name:");
  if(!name) return;

  createMarker(latlng, type.toLowerCase(), name, true);
}

function createMarker(latlng, type, name, isNew) {
  const colors = {
    house:"red",
    trader:"orange",
    tower:"yellow",
    tent:"green",
    safezone:"blue",
    infrastructure:"purple"
  };

  if(!colors[type]) return alert("Invalid type.");

  const marker = L.circleMarker(latlng,{
    radius:8,
    color:colors[type],
    fillColor:colors[type],
    fillOpacity:1
  }).addTo(map);

  marker.bindPopup(`<b>${name}</b><br><i>${type}</i>`);

  if(isNew) {
    if(currentUser.role === "admin" || currentUser.role === "mod") {
      publicMarkers.push({latlng,type,name});
    } else {
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
    }
  }
}

function loadPrivateMarkers() {
  return new Promise((resolve) => {
    privateMarkers.forEach(m => createMarker(m.latlng, m.type, m.name, false));
    resolve();
  });
}

function loadPublicMarkers() {
  return new Promise(async (resolve) => {
    try {
      const res = await fetch("publicMarkers.json");
      publicMarkers = await res.json();
      publicMarkers.forEach(m => createMarker(m.latlng, m.type, m.name, false));
    } catch(err) {
      console.error("Failed to load public markers:", err);
    } finally {
      resolve();
    }
  });
}

function exportPublicMarkers() {
  if(!currentUser || (currentUser.role !== "admin" && currentUser.role !== "mod"))
    return alert("Admins / Mods only.");

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicMarkers,null,2));

  const dl = document.createElement("a");
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", "publicMarkers.json");
  dl.click();
}

/* ================= TOWNS ================= */

function startTownPlacement() {
  if(!currentUser) return alert("Login first.");
  placingTown = true;
  alert("Click map to place town label.");
}

function promptTownDetails(latlng) {
  const name = prompt("Town name:");
  if(!name) return;

  createTown(latlng,name,true);
}

function createTown(latlng,name,isNew) {
  const label = L.divIcon({
    className:"town-label",
    html:`<div class="town-text">${name}</div>`
  });

  L.marker(latlng,{icon:label}).addTo(map);

  if(isNew && (currentUser.role === "admin" || currentUser.role === "mod")) {
    publicTowns.push({latlng,name});
  }
}

function loadPublicTowns() {
  return new Promise(async (resolve) => {
    try {
      const res = await fetch("publicTowns.json");
      publicTowns = await res.json();
      publicTowns.forEach(t => createTown(t.latlng,t.name,false));
    } catch(err) {
      console.error("Failed to load public towns:", err);
    } finally {
      resolve();
    }
  });
}

function exportPublicTowns() {
  if(!currentUser || (currentUser.role !== "admin" && currentUser.role !== "mod"))
    return alert("Admins / Mods only.");

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicTowns,null,2));

  const dl = document.createElement("a");
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", "publicTowns.json");
  dl.click();
}

/* ================= LOGIN ================= */

function openLogin() {
  document.getElementById("loginModal").classList.remove("hidden");
}

function closeLogin() {
  document.getElementById("loginModal").classList.add("hidden");
}

function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  const found = users.find(x=>x.username===u && x.password===p);

  if(found){
    currentUser = found;
  } else {
    currentUser = {username:u, role:"player"};
  }

  document.getElementById("userDisplay").innerHTML =
    `👤 ${currentUser.username} (${currentUser.role})`;

  updateAdminUI();
  closeLogin();
}

function updateAdminUI() {
  const markersBtn = document.getElementById("exportMarkersBtn");
  const townsBtn = document.getElementById("exportTownsBtn");

  if(currentUser && (currentUser.role==="admin" || currentUser.role==="mod")){
    markersBtn.style.display="inline-block";
    townsBtn.style.display="inline-block";
  } else {
    markersBtn.style.display="none";
    townsBtn.style.display="none";
  }
}

/* ================= THEME ================= */

function toggleTheme() {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}

/* ================= LOAD ================= */

window.onload = initMap;

