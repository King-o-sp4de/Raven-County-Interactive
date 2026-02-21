/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

let currentUser = null;
let map;
let gridLayer = null;
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
  map = L.map('map',{crs:L.CRS.Simple,minZoom:-2,maxZoom:4});
  const bounds = [[0,0],[MAP_SIZE,MAP_SIZE]];
  L.imageOverlay("assets/ravencounty.png", bounds).addTo(map);
  map.fitBounds(bounds);

  map.on("mousemove", updateCoords);
  map.on("click", handleMapClick);

  loadPublicMarkers();
  loadPublicTowns();
  loadPrivateMarkers();
}

/* ================= COORDS ================= */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + 64);
  const z = Math.round(ORIGIN - e.latlng.lat + 65);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function centerMap(){
  map.setView([ORIGIN,ORIGIN],0);
}

function searchCoords(){
  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);

  const lat = ORIGIN - (z - 65);
  const lng = (x - 64) + ORIGIN;

  map.setView([lat,lng],2);
}

/* ================= GRID ================= */

function toggleGrid(){
  if(gridLayer){
    map.removeLayer(gridLayer);
    gridLayer=null;
    return;
  }

  gridLayer = L.layerGroup();
  const size=32;

  for(let i=0;i<=MAP_SIZE;i+=size){
    gridLayer.addLayer(L.polyline([[0,i],[MAP_SIZE,i]]));
    gridLayer.addLayer(L.polyline([[i,0],[i,MAP_SIZE]]));
  }

  gridLayer.addTo(map);
}

/* ================= CLICK HANDLER ================= */

function handleMapClick(e){

  if(placingMarker){
    placingMarker=false;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(placingTown){
    placingTown=false;
    promptTownDetails(e.latlng);
    return;
  }
}

/* ================= MARKERS ================= */

function startMarkerPlacement(){
  if(!currentUser){ alert("Login first."); return; }
  placingMarker=true;
}

function promptMarkerDetails(latlng){
  const type=prompt("Type: house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;
  const name=prompt("Marker name?");
  if(!name) return;

  createMarker(latlng,type.toLowerCase(),name,true);
}

function createMarker(latlng,type,name,isNew){

  const colors={
    house:"red", trader:"orange", tower:"yellow",
    tent:"green", safezone:"blue", infrastructure:"purple"
  };

  if(!colors[type]){ alert("Invalid type."); return; }

  L.circleMarker(latlng,{
    radius:8,color:colors[type],
    fillColor:colors[type],fillOpacity:1
  }).addTo(map).bindPopup(`<b>${name}</b><br>${type}`);

  if(isNew){
    if(currentUser.role==="admin"||currentUser.role==="mod"){
      publicMarkers.push({latlng,type,name});
    }else{
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
    }
  }
}

/* ================= TOWNS ================= */

function startTownPlacement(){
  if(!currentUser){ alert("Login first."); return; }
  placingTown=true;
}

function promptTownDetails(latlng){
  const name=prompt("Town name?");
  if(!name) return;
  createTown(latlng,name,true);
}

function createTown(latlng,name,isNew){

  L.marker(latlng,{
    icon:L.divIcon({
      className:'town-label',
      html:name,
      iconSize:[100,30]
    })
  }).addTo(map);

  if(isNew && (currentUser.role==="admin"||currentUser.role==="mod")){
    publicTowns.push({latlng,name});
  }
}

/* ================= LOAD ================= */

async function loadPublicMarkers(){
  try{
    const res=await fetch("publicMarkers.json");
    publicMarkers=await res.json();
    publicMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
  }catch{}
}

async function loadPublicTowns(){
  try{
    const res=await fetch("publicTowns.json");
    publicTowns=await res.json();
    publicTowns.forEach(t=>createTown(t.latlng,t.name,false));
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
}

/* ================= EXPORT ================= */

function exportPublicMarkers(){
  if(!currentUser||currentUser.role!=="admin"){alert("Admin only");return;}
  downloadJSON(publicMarkers,"publicMarkers.json");
}

function exportPublicTowns(){
  if(!currentUser||currentUser.role!=="admin"){alert("Admin only");return;}
  downloadJSON(publicTowns,"publicTowns.json");
}

function downloadJSON(data,file){
  const str="data:text/json;charset=utf-8,"+
  encodeURIComponent(JSON.stringify(data,null,2));
  const a=document.createElement("a");
  a.setAttribute("href",str);
  a.setAttribute("download",file);
  a.click();
}

/* ================= LOGIN ================= */

function openLogin(){
  document.getElementById("loginModal").classList.remove("hidden");
}

function closeLogin(){
  document.getElementById("loginModal").classList.add("hidden");
}

function login(){
  const u=document.getElementById("username").value;
  const p=document.getElementById("password").value;
  const found=users.find(x=>x.username===u&&x.password===p);

  if(found){currentUser=found;}
  else{currentUser={username:u,role:"player"};}

  document.getElementById("userDisplay").innerHTML=
  `👤 ${currentUser.username} (${currentUser.role})`;

  closeLogin();
}

function logout(){location.reload();}

window.onload=initMap;
