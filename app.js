const MAP_SIZE = 2944;
const ORIGIN = 1472;
const OFFSET_X = 64;
const OFFSET_Z = 65;

let map;
let placingMarker = false;
let placingTown = false;

let publicMarkers = [];
let publicTowns = [];

function initMap(){

  map = L.map('map',{
    crs:L.CRS.Simple,
    minZoom:-2,
    maxZoom:4
  });

  const bounds = [[0,0],[MAP_SIZE,MAP_SIZE]];
  const overlay = L.imageOverlay("assets/ravencounty.png", bounds).addTo(map);
  map.fitBounds(bounds);

  overlay.on("load", () => {
    document.getElementById("loadingScreen").style.display = "none";
  });

  map.on("mousemove", updateCoords);
  map.on("click", handleMapClick);

  loadPublicMarkers();
  loadPublicTowns();
}

/* COORDS */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function searchCoords(){
  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);
  if(isNaN(x) || isNaN(z)) return;

  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = ORIGIN + (x - OFFSET_X);

  map.setView([lat,lng],2);
}

/* MARKERS */

function startMarkerPlacement(){ placingMarker = true; }
function startTownPlacement(){ placingTown = true; }

function handleMapClick(e){

  if(placingMarker){
    const name = prompt("Marker name:");
    if(!name) return;
    createMarker(e.latlng,"house",name,true);
    placingMarker = false;
  }

  if(placingTown){
    const name = prompt("Town name:");
    if(!name) return;
    createTownLabel(e.latlng,name,true);
    placingTown = false;
  }
}

function createMarker(latlng,type,name,isNew){

  const marker = L.circleMarker(latlng,{
    radius:8,
    color:"red",
    fillColor:"red",
    fillOpacity:1
  }).addTo(map);

  marker.bindPopup(`<b>${name}</b>`);

  if(isNew){
    publicMarkers.push({latlng,type,name});
  }
}

function createTownLabel(latlng,name,isNew){

  const label = L.marker(latlng,{
    icon:L.divIcon({
      className:"townLabel",
      html:`<div style="background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:6px;color:white;font-weight:bold;">${name}</div>`
    })
  }).addTo(map);

  if(isNew){
    publicTowns.push({latlng,name});
  }
}

/* LOAD */

async function loadPublicMarkers(){
  try{
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();
    publicMarkers.forEach(m=>{
      createMarker(m.latlng,m.type,m.name,false);
    });
  }catch{}
}

async function loadPublicTowns(){
  try{
    const res = await fetch("publicTowns.json");
    publicTowns = await res.json();
    publicTowns.forEach(t=>{
      createTownLabel(t.latlng,t.name,false);
    });
  }catch{}
}

/* EXPORT */

function exportPublicMarkers(){
  const data = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicMarkers,null,2));
  const a = document.createElement("a");
  a.href = data;
  a.download = "publicMarkers.json";
  a.click();
}

function exportPublicTowns(){
  const data = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicTowns,null,2));
  const a = document.createElement("a");
  a.href = data;
  a.download = "publicTowns.json";
  a.click();
}

/* THEME */

function toggleTheme(){
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
}

/* LOGIN */

function openLogin(){
  document.getElementById("loginModal").classList.remove("hidden");
}
function closeLogin(){
  document.getElementById("loginModal").classList.add("hidden");
}
function login(){
  closeLogin();
}

/* SERVICE WORKER */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

window.onload = initMap;
