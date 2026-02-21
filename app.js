const MAP_SIZE = 2944;
const ORIGIN = 1472;

const OFFSET_X = 64;
const OFFSET_Z = -65;

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

/* INIT */

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

/* COORDS */

function updateCoords(e){
  const x = Math.round(e.latlng.lng - ORIGIN + OFFSET_X);
  const z = Math.round(ORIGIN - e.latlng.lat + OFFSET_Z);
  document.getElementById("coordsBox").innerHTML = `X: ${x} | Z: ${z}`;
}

function centerMap(){
  map.setView([ORIGIN, ORIGIN], 0);
}

/* SEARCH */

function goToCoords(){
  const x = parseInt(document.getElementById("searchX").value);
  const z = parseInt(document.getElementById("searchZ").value);

  if(isNaN(x) || isNaN(z)) return alert("Invalid coords");

  const lat = ORIGIN - (z - OFFSET_Z);
  const lng = ORIGIN + (x - OFFSET_X);

  map.setView([lat, lng], 2);
}

/* GRID */

function toggleGrid(){
  if(gridLayer){
    map.removeLayer(gridLayer);
    gridLayer=null;
    return;
  }

  gridLayer=L.layerGroup();
  const size=32;

  for(let i=-ORIGIN;i<=ORIGIN;i+=size){
    const p=i+ORIGIN;
    gridLayer.addLayer(L.polyline([[0,p],[MAP_SIZE,p]]));
    gridLayer.addLayer(L.polyline([[p,0],[p,MAP_SIZE]]));
  }

  gridLayer.addTo(map);
}

/* MEASURE */

function startMeasure(){
  measurePoints=[];
  alert("Click two points.");
}

function handleMapClick(e){
  if(placingMarker){
    placingMarker=false;
    promptMarkerDetails(e.latlng);
    return;
  }

  if(measurePoints.length===1){
    measurePoints.push(e.latlng);
    const a=measurePoints[0];
    const b=measurePoints[1];

    const dx=Math.round(b.lng-a.lng);
    const dz=Math.round(a.lat-b.lat);
    const dist=Math.sqrt(dx*dx+dz*dz).toFixed(2);

    alert(`Distance: ${dist} blocks`);
    measurePoints=[];
  }
  else if(measurePoints.length===0){
    measurePoints.push(e.latlng);
  }
}

/* RIGHT CLICK */

function handleRightClick(e){
  const x=Math.round(e.latlng.lng-ORIGIN+OFFSET_X);
  const z=Math.round(ORIGIN-e.latlng.lat+OFFSET_Z);
  alert(`Block Location:\nX:${x}\nZ:${z}`);
}

/* MARKERS */

async function loadPublicMarkers(){
  try{
    const res=await fetch("publicMarkers.json");
    publicMarkers=await res.json();
    publicMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
  }catch{}
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false,true));
}

function startMarkerPlacement(){
  if(!currentUser){ alert("Login first."); return; }
  placingMarker=true;
  alert("Click map.");
}

function promptMarkerDetails(latlng){
  const type=prompt("house, trader, tower, tent, safezone, infrastructure");
  if(!type) return;
  const name=prompt("Marker name:");
  if(!name) return;
  createMarker(latlng,type.toLowerCase(),name,true);
}

function createMarker(latlng,type,name,isNew,isPrivate=false){

  const colors={
    house:"red",
    trader:"orange",
    tower:"yellow",
    tent:"green",
    safezone:"blue",
    infrastructure:"purple"
  };

  if(!colors[type]){ alert("Invalid type."); return; }

  const marker=L.circleMarker(latlng,{
    radius:8,
    color:colors[type],
    fillColor:colors[type],
    fillOpacity:1
  }).addTo(map);

  marker.bindPopup(`
    <b>${name}</b><br>
    <i>${type}</i><br>
    <button onclick="editMarker('${name}')">Edit</button>
    <button onclick="deleteMarker('${name}')">Delete</button>
  `);

  if(isNew){
    if(currentUser.role==="admin"||currentUser.role==="mod"){
      publicMarkers.push({latlng,type,name});
    }else{
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
    }
  }
}

function deleteMarker(name){
  publicMarkers=publicMarkers.filter(m=>m.name!==name);
  privateMarkers=privateMarkers.filter(m=>m.name!==name);
  localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
  location.reload();
}

function editMarker(name){
  const newName=prompt("New name:");
  if(!newName) return;
  publicMarkers.forEach(m=>{ if(m.name===name) m.name=newName; });
  privateMarkers.forEach(m=>{ if(m.name===name) m.name=newName; });
  localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
  location.reload();
}

/* LOGIN */

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
  currentUser=found?found:{username:u,role:"player"};
  document.getElementById("userDisplay").innerHTML=
    `👤 ${currentUser.username} (${currentUser.role})`;
  closeLogin();
}
function logout(){ location.reload(); }

window.onload=initMap;
