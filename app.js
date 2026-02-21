/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

/* OFFSETS (CENTER FIX) */
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

/* ================= COORD DISPLAY ================= */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);

  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

/* ================= CENTER ================= */

function centerMap(){
  map.setView([ORIGIN, ORIGIN], 0);
}

/* ================= SEARCH ================= */

function searchCoords(){

  const xInput = parseInt(document.getElementById("searchX").value);
  const zInput = parseInt(document.getElementById("searchZ").value);

  if(isNaN(xInput) || isNaN(zInput)){
    alert("Enter valid numbers.");
    return;
  }

  const lat = ORIGIN - (zInput - OFFSET_Z);
  const lng = ORIGIN + (xInput - OFFSET_X);

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

  /* MARKER PLACEMENT */
  if(placingMarker){
    placingMarker = false;
    promptMarkerDetails(e.latlng);
    return;
  }

  /* TOWN PLACEMENT */
  if(placingTown){
    placingTown = false;
    promptTownDetails(e.latlng);
    return;
  }

  /* MEASURE */
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

/* ================= RIGHT CLICK BLOCK ================= */

function handleRightClick(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);

  alert(`Block Location:\nX: ${x}\nZ: ${z}`);
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

  L.circleMarker(latlng,{
    radius:8,
    color:colors[type],
    fillColor:colors[type],
    fillOpacity:1
  }).addTo(map)
  .bindPopup(`<b>${name}</b><br><i>${type}</i>`);

  if(isNew){
    if(currentUser.role==="admin" || currentUser.role==="mod"){
      publicMarkers.push({latlng,type,name});
      alert("Public marker added. Export to save.");
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
  }catch(err){
    console.log("No public markers yet.");
  }
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>{
    createMarkerOnMap(m.latlng,m.type,m.name,false);
  });
}

/* ================= TOWNS ================= */

function startTownPlacement(){
  if(!currentUser || (currentUser.role!=="admin" && currentUser.role!=="mod")){
    alert("Admins/Mods only.");
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
    interactive:false,
    icon:L.divIcon({
      className:"town-label",
      html:`<div>${name}</div>`
    })
  }).addTo(map);

  if(isNew){
    publicTowns.push({latlng,name});
    alert("Town added. Export towns.");
  }
}

async function loadPublicTowns(){
  try{
    const res = await fetch("publicTowns.json");
    publicTowns = await res.json();
    publicTowns.forEach(t=>{
      createTownLabel(t.latlng,t.name,false);
    });
  }catch(err){
    console.log("No towns yet.");
  }
}

/* ================= EXPORTS ================= */

function exportPublicMarkers(){
  if(!currentUser || currentUser.role!=="admin") return;

  const dataStr="data:text/json;charset=utf-8,"+
  encodeURIComponent(JSON.stringify(publicMarkers,null,2));

  const a=document.createElement("a");
  a.setAttribute("href",dataStr);
  a.setAttribute("download","publicMarkers.json");
  a.click();
}

function exportPublicTowns(){
  if(!currentUser || currentUser.role!=="admin") return;

  const dataStr="data:text/json;charset=utf-8,"+
  encodeURIComponent(JSON.stringify(publicTowns,null,2));

  const a=document.createElement("a");
  a.setAttribute("href",dataStr);
  a.setAttribute("download","publicTowns.json");
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

  const found=users.find(x=>x.username===u && x.password===p);

  if(found){
    currentUser=found;
  }else{
    currentUser={username:u,role:"player"};
  }

  document.getElementById("userDisplay").innerHTML=
  `👤 ${currentUser.username} (${currentUser.role})`;

  closeLogin();
  updateAdminButtons();
}

function logout(){
  location.reload();
}

function updateAdminButtons(){

  const markerBtn=document.getElementById("exportMarkersBtn");
  const townBtn=document.getElementById("exportTownsBtn");

  if(!currentUser || (currentUser.role!=="admin" && currentUser.role!=="mod")){
    if(markerBtn) markerBtn.style.display="none";
    if(townBtn) townBtn.style.display="none";
  }else{
    if(markerBtn) markerBtn.style.display="inline-block";
    if(townBtn) townBtn.style.display="inline-block";
  }
}

/* ================= THEME ================= */

function toggleTheme(){
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
}

/* ================= START ================= */

window.onload = initMap;
