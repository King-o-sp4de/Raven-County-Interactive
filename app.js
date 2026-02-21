/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

// OFFSETS
const OFFSET_X = 64;
const OFFSET_Z = 65;

let map;
let gridLayer = null;
let measurePoints = [];

let placingMarker = false;
let placingTown = false;

let publicMarkers = [];
let publicTowns = [];

let privateMarkers = JSON.parse(localStorage.getItem("privateMarkers") || "[]");

/* ================= INIT ================= */

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

  loadPublicMarkers();
  loadPublicTowns();
  loadPrivateMarkers();
}

window.onload = initMap;

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
  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);
  if(isNaN(x)||isNaN(z)) return;

  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = (x - OFFSET_X) + ORIGIN;

  map.setView([lat,lng],2);
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

  for(let i=0;i<=MAP_SIZE;i+=size){
    gridLayer.addLayer(L.polyline([[0,i],[MAP_SIZE,i]]));
    gridLayer.addLayer(L.polyline([[i,0],[i,MAP_SIZE]]));
  }

  gridLayer.addTo(map);
}

/* ================= MEASURE ================= */

function startMeasure(){
  measurePoints=[];
  alert("Click two points.");
}

function handleMapClick(e){

  if(placingMarker){
    placingMarker=false;
    promptMarker(e.latlng);
    return;
  }

  if(placingTown){
    placingTown=false;
    promptTown(e.latlng);
    return;
  }

  if(measurePoints.length===1){
    measurePoints.push(e.latlng);
    const a=measurePoints[0];
    const b=measurePoints[1];

    const dx=Math.round(b.lng-a.lng);
    const dz=Math.round(a.lat-b.lat);
    const dist=Math.sqrt(dx*dx+dz*dz).toFixed(2);

    alert(`Distance: ${dist}`);
    measurePoints=[];
  }
  else if(measurePoints.length===0){
    measurePoints.push(e.latlng);
  }
}

/* ================= MARKERS ================= */

function startMarkerPlacement(){
  placingMarker=true;
  alert("Click map to place marker.");
}

function promptMarker(latlng){

  const type = prompt("Type: house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;

  const name = prompt("Name?");
  if(!name) return;

  createMarker(latlng,type.toLowerCase(),name,true);
}

function createMarker(latlng,type,name,isNew){

  const colors={
    house:"red",
    trader:"orange",
    tower:"yellow",
    tent:"green",
    safezone:"blue",
    infrastructure:"purple"
  };

  if(!colors[type]) return;

  const marker=L.circleMarker(latlng,{
    radius:8,
    color:colors[type],
    fillColor:colors[type],
    fillOpacity:1
  }).addTo(map);

  marker.bindPopup(`<b>${name}</b><br>${type}`);

  if(isNew){
    publicMarkers.push({latlng,type,name});
  }
}

async function loadPublicMarkers(){
  try{
    const res=await fetch("publicMarkers.json");
    publicMarkers=await res.json();
    publicMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
}

function exportPublicMarkers(){
  const data="data:text/json;charset=utf-8,"+
  encodeURIComponent(JSON.stringify(publicMarkers,null,2));
  const dl=document.createElement("a");
  dl.href=data;
  dl.download="publicMarkers.json";
  dl.click();
}

/* ================= TOWNS ================= */

function startTownPlacement(){
  placingTown=true;
  alert("Click map to place town.");
}

function promptTown(latlng){

  const name=prompt("Town Name?");
  if(!name) return;

  createTown(latlng,name,true);
}

function createTown(latlng,name,isNew){

  const label=L.marker(latlng,{
    icon:L.divIcon({
      className:'town-label',
      html:name
    })
  }).addTo(map);

  if(isNew){
    publicTowns.push({latlng,name});
  }
}

async function loadPublicTowns(){
  try{
    const res=await fetch("publicTowns.json");
    publicTowns=await res.json();
    publicTowns.forEach(t=>createTown(t.latlng,t.name,false));
  }catch{}
}

function exportPublicTowns(){
  const data="data:text/json;charset=utf-8,"+
  encodeURIComponent(JSON.stringify(publicTowns,null,2));
  const dl=document.createElement("a");
  dl.href=data;
  dl.download="publicTowns.json";
  dl.click();
}
