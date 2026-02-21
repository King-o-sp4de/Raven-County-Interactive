/* ================= SETTINGS ================= */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

// CENTER FIX
const OFFSET_X = 64;
const OFFSET_Z = 65;

let currentUser = null;
let map;
let gridLayer = null;
let measurePoints = [];
let placingMarker = false;

let publicMarkers = [];
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

  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);

  if(isNaN(x) || isNaN(z)){
    alert("Enter valid coordinates.");
    return;
  }

  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = ORIGIN + (x - OFFSET_X);

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
  measurePoints = [];
  alert("Click two points to measure distance.");
}

function handleMapClick(e){

  if(placingMarker){
    placingMarker = false;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(measurePoints.length === 1){
    measurePoints.push(e.latlng);

    const a = measurePoints[0];
    const b = measurePoints[1];

    const dx = Math.round((b.lng - a.lng));
    const dz = Math.round((a.lat - b.lat));
    const dist = Math.sqrt(dx*dx + dz*dz).toFixed(2);

    alert(`Distance: ${dist} blocks\nΔX: ${dx}\nΔZ: ${dz}`);
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
  alert("Click on map to place marker.");
}

function promptMarkerDetails(latlng){

  const type = prompt("Type: house, trader, tower, tent, safezone, infrastructure, town");
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
    infrastructure:"purple",
    town:"white"
  };

  if(!colors[type]){
    alert("Invalid type.");
    return;
  }

  let marker;

  if(type === "town"){
    marker = L.marker(latlng,{
      icon: L.divIcon({
        className: "town-label",
        html: `<div class="townText">${name}</div>`
      })
    }).addTo(map);
  } else {
    marker = L.circleMarker(latlng,{
      radius:8,
      color:colors[type],
      fillColor:colors[type],
      fillOpacity:1
    }).addTo(map);
  }

  marker.customData = {latlng,type,name};

  marker.on("click",function(){

    const action = prompt("Type 'edit' or 'delete'");

    if(action === "delete"){
      map.removeLayer(marker);

      if(currentUser.role === "admin"){
        publicMarkers = publicMarkers.filter(m=>m.name !== name);
      } else {
        privateMarkers = privateMarkers.filter(m=>m.name !== name);
        localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
      }
    }

    if(action === "edit"){
      const newName = prompt("New name:", name);
      if(!newName) return;

      marker.customData.name = newName;

      if(type === "town"){
        marker.setIcon(L.divIcon({
          className:"town-label",
          html:`<div class="townText">${newName}</div>`
        }));
      } else {
        marker.bindPopup(`<b>${newName}</b><br><i>${type}</i>`);
      }
    }

  });

  if(type !== "town"){
    marker.bindPopup(`<b>${name}</b><br><i>${type}</i>`);
  }

  if(isNew){
    if(currentUser.role === "admin" || currentUser.role === "mod"){
      publicMarkers.push({latlng,type,name});
      alert("Public marker added. Export JSON to update server.");
    } else {
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers", JSON.stringify(privateMarkers));
    }
  }
}

/* ================= LOAD MARKERS ================= */

async function loadPublicMarkers(){
  try{
    const res = await fetch("publicMarkers.json");
    publicMarkers = await res.json();

    publicMarkers.forEach(m=>{
      createMarker(m.latlng,m.type,m.name,false);
    });

  }catch(err){
    console.log("No public markers yet.");
  }
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>{
    createMarker(m.latlng,m.type,m.name,false);
  });
}

/* ================= EXPORT ================= */

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

window.onload = initMap;
