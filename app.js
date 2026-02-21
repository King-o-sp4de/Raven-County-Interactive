/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1408;

let currentUser = null;
let map;
let gridLayer = null;
let measurePoints = [];
let placingMarker = null;

let publicMarkers = [];
let privateMarkers = JSON.parse(localStorage.getItem("privateMarkers") || "[]");
let townLabels = [];

const users = [
  {username:"Kingosp4de",password:"BlaiseKey2026",role:"admin"},
  {username:"Xzyus",password:"HitByAAda4x4",role:"mod"}
];

/* ================= MAP INIT ================= */

function initMap(){

  map = L.map('map',{
    crs:L.CRS.Simple,
    minZoom:-2,
    maxZoom:4
  });

  const bounds = [[0,0],[MAP_SIZE,MAP_SIZE]];
  L.imageOverlay("assets/ravencounty.png", bounds).addTo(map);
  map.fitBounds(bounds);

  map.on("mousemove", updateCoords);
  map.on("click", handleMapClick);
  map.on("contextmenu", handleRightClick);

  loadPublicMarkers();
  loadPrivateMarkers();
  loadTownLabels();
}

/* ================= COORDS ================= */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN);
  const z = Math.round(ORIGIN - e.latlng.lat);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function centerMap(){
  map.setView([ORIGIN, ORIGIN], 0);
}

/* ================= GRID ================= */

function toggleGrid(){

  if(gridLayer){
    map.removeLayer(gridLayer);
    gridLayer = null;
    return;
  }

  gridLayer = L.layerGroup();
  const size = 32;

  for(let i=-ORIGIN;i<=ORIGIN;i+=size){
    const p = i + ORIGIN;
    gridLayer.addLayer(L.polyline([[0,p],[MAP_SIZE,p]]));
    gridLayer.addLayer(L.polyline([[p,0],[p,MAP_SIZE]]));
  }

  gridLayer.addTo(map);
}

/* ================= MEASURE ================= */

function startMeasure(){
  measurePoints = [];
  alert("Click two points to measure.");
}

function handleMapClick(e){

  if(placingMarker === "town"){
    placingMarker = null;
    const name = prompt("Enter town name:");
    if(name){
      createTownLabel(e.latlng, name, true);
    }
    return;
  }

  if(placingMarker === "marker"){
    placingMarker = null;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(measurePoints.length === 1){
    measurePoints.push(e.latlng);

    const a = measurePoints[0];
    const b = measurePoints[1];

    const dx = Math.round(b.lng - a.lng);
    const dz = Math.round(a.lat - b.lat);
    const dist = Math.sqrt(dx*dx + dz*dz).toFixed(2);

    alert(`Distance: ${dist} blocks\nΔX: ${dx}\nΔZ: ${dz}`);
    measurePoints = [];
  }
  else if(measurePoints.length === 0){
    measurePoints.push(e.latlng);
  }
}

/* ================= RIGHT CLICK BLOCK LOCATION ================= */

function handleRightClick(e){
  const x = Math.round(e.latlng.lng - ORIGIN);
  const z = Math.round(ORIGIN - e.latlng.lat);
  alert(`Block Location:\nX: ${x}\nZ: ${z}`);
}

/* ================= PUBLIC MARKERS ================= */

async function loadPublicMarkers(){
  try {
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();

    publicMarkers.forEach(m=>{
      createMarkerOnMap(m.latlng, m.type, m.name, false);
    });

  } catch(err){
    console.log("No public markers found.");
  }
}

/* ================= PRIVATE MARKERS ================= */

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>{
    createMarkerOnMap(m.latlng, m.type, m.name, false);
  });
}

/* ================= CREATE MARKER ================= */

function startMarkerPlacement(){
  if(!currentUser){
    alert("Login first.");
    return;
  }
  placingMarker = "marker";
  alert("Click map to place marker.");
}

function promptMarkerDetails(latlng){

  const type = prompt("Type: house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;

  const name = prompt("Enter marker name:");
  if(!name) return;

  createMarkerOnMap(latlng, type.toLowerCase(), name, true);
}

function createMarkerOnMap(latlng, type, name, isNew){

  const colors = {
    house:"red",
    trader:"orange",
    tower:"yellow",
    tent:"green",
    safezone:"blue",
    infrastructure:"purple"
  };

  if(!colors[type]){
    alert("Invalid type.");
    return;
  }

  const marker = L.circleMarker(latlng,{
    radius:8,
    color:colors[type],
    fillColor:colors[type],
    fillOpacity:1
  }).addTo(map);

  const popupContent = `
    <b>${name}</b><br>
    <i>${type}</i><br><br>
    <button onclick="editMarker('${name}', '${type}', ${latlng.lat}, ${latlng.lng})">✏ Edit</button>
    <button onclick="deleteMarker('${name}', ${latlng.lat}, ${latlng.lng})">🗑 Delete</button>
  `;

  marker.bindPopup(popupContent);

  if(isNew){
    if(currentUser.role === "admin" || currentUser.role === "mod"){
      publicMarkers.push({latlng, type, name});
    } else {
      privateMarkers.push({latlng, type, name});
      localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
    }
  }
}

/* ================= TOWN LABELS ================= */

async function loadTownLabels(){
  try {
    const res = await fetch("townLabels.json");
    townLabels = await res.json();

    townLabels.forEach(t=>{
      createTownLabel(t.latlng, t.name, false);
    });

  } catch(err){
    console.log("No town labels found.");
  }
}

function startTownPlacement(){
  if(!currentUser || (currentUser.role !== "admin" && currentUser.role !== "mod")){
    alert("Admins or Mods only.");
    return;
  }
  placingMarker = "town";
  alert("Click map to place town label.");
}

function createTownLabel(latlng, name, isNew){

  const label = L.marker(latlng, {
    icon: L.divIcon({
      className: "town-label",
      html: name,
      iconSize: null
    }),
    interactive: false
  });

  label.addTo(map);

  if(isNew){
    townLabels.push({latlng, name});
    alert("Town added. Export JSON to update server.");
  }
}

function exportTownLabels(){
  if(!currentUser || currentUser.role !== "admin"){
    alert("Admins only.");
    return;
  }

function exportPublicMarkers() {
  const dataStr = JSON.stringify(publicMarkers, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "publicMarkers.json";
  link.click();

  URL.revokeObjectURL(link.href);
}

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(townLabels,null,2));

  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "townLabels.json");
  dlAnchor.click();
}

/* ================= EXPORT PUBLIC ================= */

function exportPublicMarkers(){
  if(!currentUser || currentUser.role !== "admin"){
    alert("Admins only.");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicMarkers,null,2));

  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "publicMarkers.json");
  dlAnchor.click();
}

/* ================= THEME ================= */

function toggleTheme(){
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}

/* ================= LOGIN ================= */

function openLogin(){
  document.getElementById("loginModal").classList.remove("hidden");
}

function closeLogin(){
  document.getElementById("loginModal").classList.add("hidden");
}

function login(){

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

  closeLogin();
}

function logout(){
  location.reload();
}

/* ================= START ================= */

function editMarker(name, type, lat, lng){

  const newName = prompt("New name:", name);
  if(!newName) return;

  const newType = prompt("New type:", type);
  if(!newType) return;

  deleteMarker(name, lat, lng);

  createMarkerOnMap({lat:lat, lng:lng}, newType.toLowerCase(), newName, true);
}

function deleteMarker(name, lat, lng){

  map.eachLayer(layer => {
    if(layer instanceof L.CircleMarker){
      const ll = layer.getLatLng();
      if(ll.lat === lat && ll.lng === lng){
        map.removeLayer(layer);
      }
    }
  });

  publicMarkers = publicMarkers.filter(m =>
    !(m.latlng.lat === lat && m.latlng.lng === lng)
  );

  privateMarkers = privateMarkers.filter(m =>
    !(m.latlng.lat === lat && m.latlng.lng === lng)
  );

  localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
}

function goToCoords(){

  const input = document.getElementById("coordInput").value.trim();
  const parts = input.split(" ");

  if(parts.length !== 2){
    alert("Use format: X Z");
    return;
  }

  const x = parseInt(parts[0]);
  const z = parseInt(parts[1]);

  if(isNaN(x) || isNaN(z)){
    alert("Invalid numbers");
    return;
  }

  const lat = ORIGIN - z;
  const lng = x + ORIGIN;

  map.setView([lat, lng], 2);

  L.marker([lat, lng]).addTo(map)
    .bindPopup(`X: ${x}<br>Z: ${z}`)
    .openPopup();
}

window.onload = initMap;


