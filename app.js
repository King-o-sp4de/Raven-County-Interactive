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

  const input = document.getElementById("coordSearch").value;
  const parts = input.split(",");

  if(parts.length !== 2) return alert("Format: X,Z");

  const x = parseInt(parts[0].trim()) - OFFSET_X;
  const z = parseInt(parts[1].trim()) - OFFSET_Z;

  const lat = ORIGIN - z;
  const lng = x + ORIGIN;

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
  alert("Click two points.");
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

    alert(`Distance: ${dist} blocks`);
    measurePoints = [];
  }
  else if(measurePoints.length === 0){
    measurePoints.push(e.latlng);
  }
}


/* ================= RIGHT CLICK BLOCK LOCATION ================= */

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

  const name = prompt("Marker name:");
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

  marker.bindPopup(`<b>${name}</b><br><i>${type}</i>`);

  if(isNew){
    if(currentUser.role === "admin" || currentUser.role === "mod"){
      publicMarkers.push({latlng,type,name});
    } else {
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
    }
  }
}

async function loadPublicMarkers(){
  try{
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();
    publicMarkers.forEach(m => createMarker(m.latlng,m.type,m.name,false));
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m => createMarker(m.latlng,m.type,m.name,false));
}

function exportPublicMarkers(){
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

function startTownPlacement(){
  if(!currentUser) return alert("Login first.");
  placingTown = true;
  alert("Click map to place town label.");
}

function promptTownDetails(latlng){

  const name = prompt("Town name:");
  if(!name) return;

  createTown(latlng,name,true);
}

function createTown(latlng,name,isNew){

  const label = L.divIcon({
    className:"town-label",
    html:`<div class="town-text">${name}</div>`
  });

  L.marker(latlng,{icon:label}).addTo(map);

  if(isNew){
    if(currentUser.role === "admin" || currentUser.role === "mod"){
      publicTowns.push({latlng,name});
    }
  }
}

async function loadPublicTowns(){
  try{
    const res = await fetch("publicTowns.json");
    publicTowns = await res.json();
    publicTowns.forEach(t => createTown(t.latlng,t.name,false));
  }catch{}
}

function exportPublicTowns(){
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

  updateAdminUI();
  closeLogin();
}

function updateAdminUI(){

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

function toggleTheme(){
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}


/* ================= LOAD ================= */

window.onload = initMap;
