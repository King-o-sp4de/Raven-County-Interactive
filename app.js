/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

const OFFSET_X = 64;
const OFFSET_Z = 65;

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
  loadPublicTowns();
  loadPrivateMarkers();
}

/* ================= COORDS ================= */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function centerMap(){
  map.setView([ORIGIN, ORIGIN], 0);
}

/* ================= SEARCH ================= */

function searchCoords(){
  const input = document.getElementById("coordSearch").value.trim();
  const parts = input.split(",");

  if(parts.length !== 2) return alert("Use format: X,Z");

  const x = parseInt(parts[0]);
  const z = parseInt(parts[1]);

  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = ORIGIN + (x - OFFSET_X);

  map.setView([lat, lng], 2);
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
  alert("Click two points to measure distance.");
}

function handleMapClick(e){

  if(placingMarker){
    placingMarker = false;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(placingTown){
    placingTown = false;
    promptTownDetails(e.latlng);
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

/* ================= RIGHT CLICK ================= */

function handleRightClick(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  alert(`Block Location:\nX: ${x}\nZ: ${z}`);
}

/* ================= MARKERS ================= */

function startMarkerPlacement(){
  if(!currentUser) return alert("Login first.");
  placingMarker = true;
  alert("Click map to place marker.");
}

function promptMarkerDetails(latlng){
  const type = prompt("Type: house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;

  const name = prompt("Enter marker name:");
  if(!name) return;

  createMarker(latlng, type.toLowerCase(), name, true);
}

function createMarker(latlng, type, name, isNew){

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

  marker.bindPopup(`
    <b>${name}</b><br>
    <i>${type}</i><br><br>
    <button onclick="editMarker('${name}')">Edit</button>
    <button onclick="deleteMarker('${name}')">Delete</button>
  `);

  if(isNew){
    if(currentUser.role === "admin" || currentUser.role === "mod"){
      publicMarkers.push({latlng,type,name});
    } else {
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
    }
  }
}

function editMarker(name){
  const newName = prompt("New name:");
  if(!newName) return;
  publicMarkers.forEach(m=>{
    if(m.name === name) m.name = newName;
  });
  alert("Renamed. Export to save.");
}

function deleteMarker(name){
  publicMarkers = publicMarkers.filter(m=>m.name!==name);
  alert("Deleted. Export to save.");
  location.reload();
}

/* ================= TOWNS ================= */

function startTownPlacement(){
  if(!currentUser || currentUser.role!=="admin")
    return alert("Admins only.");
  placingTown = true;
  alert("Click map to place town label.");
}

function promptTownDetails(latlng){
  const name = prompt("Town name:");
  if(!name) return;

  publicTowns.push({latlng,name});
  createTownLabel(latlng,name);
}

function createTownLabel(latlng,name){
  const icon = L.divIcon({
    className:'town-label',
    html:`<div>${name}</div>`
  });
  L.marker(latlng,{icon}).addTo(map);
}

/* ================= LOAD DATA ================= */

async function loadPublicMarkers(){
  try{
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();
    publicMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
  }catch{}
}

async function loadPublicTowns(){
  try{
    const res = await fetch("publicTowns.json");
    publicTowns = await res.json();
    publicTowns.forEach(t=>createTownLabel(t.latlng,t.name));
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
}

/* ================= EXPORT ================= */

function exportPublicMarkers(){
  if(!currentUser || currentUser.role!=="admin")
    return alert("Admins only.");

  downloadJSON(publicMarkers,"publicMarkers.json");
}

function exportPublicTowns(){
  if(!currentUser || currentUser.role!=="admin")
    return alert("Admins only.");

  downloadJSON(publicTowns,"publicTowns.json");
}

function downloadJSON(data,filename){
  const dataStr = "data:text/json;charset=utf-8,"+
    encodeURIComponent(JSON.stringify(data,null,2));
  const dl = document.createElement("a");
  dl.setAttribute("href",dataStr);
  dl.setAttribute("download",filename);
  dl.click();
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

/* ================= INIT ================= */

window.onload = initMap;
