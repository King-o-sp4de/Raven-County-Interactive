/* ================================
   RAVEN COUNTY INTERACTIVE MAP
   Clean Build – X+64 Z+65 Center
================================ */

const MAP_SIZE = 2944;
const ORIGIN = 1472;

// CENTER CORRECTION
const OFFSET_X = 64;
const OFFSET_Z = 65;

let currentUser = null;
let map;
let gridLayer = null;
let measurePoints = [];
let placingMarker = false;
let placingTown = false;

let publicMarkers = [];
let townLabels = [];
let privateMarkers = JSON.parse(localStorage.getItem("privateMarkers") || "[]");

const users = [
  {username:"Kingosp4de",password:"BlaiseKey2026",role:"admin"},
  {username:"Xzyus",password:"HitByAAda4x4",role:"mod"}
];

/* ================================
   MAP INIT
================================ */

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
  loadTownLabels();
}

/* ================================
   COORD CONVERSION
================================ */

function convertToMapCoords(x, z){
  return [
    ORIGIN - (z + OFFSET_Z),
    (x + OFFSET_X) + ORIGIN
  ];
}

function convertToGameCoords(latlng){
  return {
    x: Math.round(latlng.lng - ORIGIN - OFFSET_X),
    z: Math.round(ORIGIN - latlng.lat - OFFSET_Z)
  };
}

function updateCoords(e){
  const coords = convertToGameCoords(e.latlng);
  coordsBox.innerHTML = `X: ${coords.x} | Z: ${coords.z}`;
}

/* ================================
   SEARCH BAR
================================ */

function searchCoords(){
  const input = document.getElementById("coordSearch").value.trim();
  const parts = input.split(" ");

  if(parts.length !== 2){
    alert("Enter X Z");
    return;
  }

  const x = parseInt(parts[0]);
  const z = parseInt(parts[1]);

  map.setView(convertToMapCoords(x,z), 1);
}

/* ================================
   LOGIN
================================ */

function login(){
  const u = username.value;
  const p = password.value;

  const found = users.find(x=>x.username===u && x.password===p);

  if(found){
    currentUser = found;
    userDisplay.innerHTML = `Logged in as ${found.username} (${found.role})`;
  } else {
    alert("Invalid login");
    return;
  }

  loginModal.classList.add("hidden");
}

function logout(){
  location.reload();
}

function openLogin(){
  loginModal.classList.remove("hidden");
}

function closeLogin(){
  loginModal.classList.add("hidden");
}

/* ================================
   GRID / CENTER
================================ */

function toggleGrid(){
  if(gridLayer){
    map.removeLayer(gridLayer);
    gridLayer=null;
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

function centerMap(){
  map.setView(convertToMapCoords(0,0),0);
}

/* ================================
   PUBLIC MARKERS
================================ */

function loadPublicMarkers(){
  fetch("publicMarkers.json")
    .then(res=>res.json())
    .then(data=>{
      publicMarkers = data;

      publicMarkers.forEach(m=>{
        L.marker(convertToMapCoords(m.x,m.z))
          .addTo(map)
          .bindPopup(`<b>${m.name}</b><br>${m.type}`);
      });
    })
    .catch(()=>console.log("No publicMarkers.json found"));
}

function exportPublicMarkers(){
  if(!currentUser || currentUser.role!=="admin"){
    alert("Admins only");
    return;
  }

  const blob = new Blob(
    [JSON.stringify(publicMarkers,null,2)],
    {type:"application/json"}
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download="publicMarkers.json";
  a.click();
}

/* ================================
   TOWN LABELS
================================ */

function startTownPlacement(){
  if(!currentUser || currentUser.role!=="admin"){
    alert("Admins only");
    return;
  }

  placingTown = true;
  alert("Click map to place town label");
}

function loadTownLabels(){
  const saved = JSON.parse(localStorage.getItem("townLabels") || "[]");
  townLabels = saved;

  townLabels.forEach(t=>{
    L.marker(convertToMapCoords(t.x,t.z),{
      icon:L.divIcon({
        className:"town-label",
        html:t.name
      })
    }).addTo(map);
  });
}

function saveTownLabels(){
  localStorage.setItem("townLabels", JSON.stringify(townLabels));
}

/* ================================
   CLICK HANDLING
================================ */

function handleMapClick(e){

  if(placingTown){
    placingTown=false;

    const coords = convertToGameCoords(e.latlng);
    const name = prompt("Town name?");
    if(!name) return;

    L.marker(e.latlng,{
      icon:L.divIcon({
        className:"town-label",
        html:name
      })
    }).addTo(map);

    townLabels.push({x:coords.x,z:coords.z,name:name});
    saveTownLabels();
    return;
  }

  if(placingMarker){
    placingMarker=false;

    const coords = convertToGameCoords(e.latlng);
    const name = prompt("Marker name?");
    const type = prompt("Type?");

    if(!name || !type) return;

    publicMarkers.push({x:coords.x,z:coords.z,name,type});

    L.marker(e.latlng)
      .addTo(map)
      .bindPopup(`<b>${name}</b><br>${type}`);
  }
}

function handleRightClick(e){
  alert("Right click disabled for now");
}

/* ================================
   START MAP
================================ */

initMap();
