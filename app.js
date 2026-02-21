/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

// Coordinate offsets (center fix)
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

window.onload = initMap;

/* ================= COORDS ================= */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);

  document.getElementById("coordsBox").innerHTML =
    `X: ${x} | Z: ${z}`;
}

function centerMap(){
  map.setView([ORIGIN, ORIGIN], 0);
}

/* ================= SEARCH ================= */

function goToCoords(){

  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);

  if(isNaN(x) || isNaN(z)){
    alert("Enter valid coordinates.");
    return;
  }

  const lat = ORIGIN - (z - 65);
  const lng = (x - 64) + ORIGIN;

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

/* ================= MARKERS ================= */

function startMarkerPlacement(){
  if(!currentUser){
    alert("Login first.");
    return;
  }
  placingMarker = true;
  alert("Click map to place marker.");
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
  }
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

  marker.bindPopup(`<b>${name}</b><br><i>${type}</i>`);

  if(isNew){
    if(currentUser.role==="admin" || currentUser.role==="mod"){
      publicMarkers.push({latlng,type,name});
    } else {
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
    }
  }
}

async function loadPublicMarkers(){
  try{
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();

    publicMarkers.forEach(m=>{
      createMarkerOnMap(m.latlng,m.type,m.name,false);
    });
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>{
    createMarkerOnMap(m.latlng,m.type,m.name,false);
  });
}

/* ================= TOWNS ================= */

function startTownPlacement(){
  if(!currentUser){
    alert("Login first.");
    return;
  }
  placingTown = true;
  alert("Click map to place town label.");
}

function promptTownDetails(latlng){
  const name = prompt("Town name:");
  if(!name) return;

  createTownLabel(latlng,name,true);
}

function createTownLabel(latlng,name,isNew){

  const label = L.marker(latlng,{
    icon: L.divIcon({
      className:"town-label",
      html:`<div>${name}</div>`
    })
  }).addTo(map);

  if(isNew){
    if(currentUser.role==="admin" || currentUser.role==="mod"){
      publicTowns.push({latlng,name});
    }
  }
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

/* ================= EXPORT ================= */

function exportPublicMarkers(){
  if(!currentUser || (currentUser.role!=="admin" && currentUser.role!=="mod")){
    alert("Admins or Mods only.");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicMarkers,null,2));

  const dl = document.createElement("a");
  dl.href = dataStr;
  dl.download = "publicMarkers.json";
  dl.click();
}

function exportPublicTowns(){
  if(!currentUser || (currentUser.role!=="admin" && currentUser.role!=="mod")){
    alert("Admins or Mods only.");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(publicTowns,null,2));

  const dl = document.createElement("a");
  dl.href = dataStr;
  dl.download = "publicTowns.json";
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

    // Show admin tools
    document.getElementById("exportMarkersBtn").style.display="inline-block";
    document.getElementById("exportTownsBtn").style.display="inline-block";
  } else {
    currentUser = {username:u,role:"player"};
  }

  document.getElementById("userDisplay").innerHTML =
    `👤 ${currentUser.username} (${currentUser.role})`;

  closeLogin();
}

function logout(){
  location.reload();
}

/* ================= THEME ================= */

function toggleTheme(){
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}

