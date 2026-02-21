const MAP_SIZE = 2944;
const ORIGIN = 1472;
const OFFSET_X = 64;
const OFFSET_Z = 65;

let map;
let gridLayer=null;
let measurePoints=[];
let placingMarker=false;
let placingTown=false;

let publicMarkers=[];
let publicTowns=[];
let privateMarkers=JSON.parse(localStorage.getItem("privateMarkers")||"[]");

let currentUser=null;

const users=[
  {username:"Kingosp4de",password:"BlaiseKey2026",role:"admin"},
  {username:"Xzyus",password:"HitByAAda4x4",role:"mod"}
];

async function initMap(){

  map=L.map('map',{crs:L.CRS.Simple,minZoom:-2,maxZoom:4});
  const bounds=[[0,0],[MAP_SIZE,MAP_SIZE]];

  const img=L.imageOverlay("assets/ravencounty.png",bounds);

  img.on("load",async()=>{
    map.fitBounds(bounds);

    map.on("mousemove",updateCoords);
    map.on("click",handleMapClick);
    map.on("contextmenu",handleRightClick);

    await loadPublicMarkers();
    await loadPublicTowns();
    loadPrivateMarkers();

    document.getElementById("loadingScreen").style.display="none";
  });

  img.addTo(map);
}

function updateCoords(e){
  const x=Math.round(e.latlng.lng-ORIGIN+OFFSET_X);
  const z=Math.round(ORIGIN-e.latlng.lat+OFFSET_Z);
  document.getElementById("coordsBox").innerHTML=`X:${x} Z:${z}`;
}

function centerMap(){
  map.setView([ORIGIN,ORIGIN],0);
}

function toggleTheme(){
  document.body.classList.toggle("dark");
}

function toggleGrid(){
  if(gridLayer){map.removeLayer(gridLayer);gridLayer=null;return;}
  gridLayer=L.layerGroup();
  for(let i=0;i<=MAP_SIZE;i+=32){
    gridLayer.addLayer(L.polyline([[0,i],[MAP_SIZE,i]]));
    gridLayer.addLayer(L.polyline([[i,0],[i,MAP_SIZE]]));
  }
  gridLayer.addTo(map);
}

function startMeasure(){
  measurePoints=[];
  alert("Click two points.");
}

function handleMapClick(e){

  if(placingMarker){placingMarker=false;promptMarker(e.latlng);return;}
  if(placingTown){placingTown=false;promptTown(e.latlng);return;}

  if(measurePoints.length===1){
    measurePoints.push(e.latlng);
    const a=measurePoints[0],b=measurePoints[1];
    const dx=Math.round(b.lng-a.lng);
    const dz=Math.round(a.lat-b.lat);
    const dist=Math.sqrt(dx*dx+dz*dz).toFixed(2);
    alert(`Distance:${dist}`);
    measurePoints=[];
  }else measurePoints.push(e.latlng);
}

function handleRightClick(e){
  const x=Math.round(e.latlng.lng-ORIGIN+OFFSET_X);
  const z=Math.round(ORIGIN-e.latlng.lat+OFFSET_Z);
  alert(`X:${x} Z:${z}`);
}

async function loadPublicMarkers(){
  const res=await fetch("publicMarkers.json");
  publicMarkers=await res.json();
  publicMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
}

async function loadPublicTowns(){
  const res=await fetch("publicTowns.json");
  publicTowns=await res.json();
  publicTowns.forEach(t=>createTown(t.latlng,t.name,false));
}

function loadPrivateMarkers(){
  privateMarkers.forEach(m=>createMarker(m.latlng,m.type,m.name,false));
}

function startMarkerPlacement(){if(!currentUser)return alert("Login first");placingMarker=true;}
function startTownPlacement(){if(!currentUser)return alert("Login first");placingTown=true;}

function promptMarker(latlng){
  const type=prompt("house,trader,tower,tent,safezone,infrastructure");
  const name=prompt("Name?");
  createMarker(latlng,type,name,true);
}

function createMarker(latlng,type,name,isNew){
  const colors={house:"red",trader:"orange",tower:"yellow",tent:"green",safezone:"blue",infrastructure:"purple"};
  if(!colors[type])return alert("Invalid");
  const marker=L.circleMarker(latlng,{radius:8,color:colors[type],fillColor:colors[type],fillOpacity:1}).addTo(map);
  marker.bindPopup(`<b>${name}</b><br>${type}`);
  if(isNew){
    if(currentUser.role==="admin"||currentUser.role==="mod"){
      publicMarkers.push({latlng,type,name});
    }else{
      privateMarkers.push({latlng,type,name});
      localStorage.setItem("privateMarkers",JSON.stringify(privateMarkers));
    }
  }
}

function promptTown(latlng){
  const name=prompt("Town name?");
  createTown(latlng,name,true);
}

function createTown(latlng,name,isNew){
  const label=L.marker(latlng,{
    icon:L.divIcon({className:"town-label",html:name})
  }).addTo(map);
  if(isNew){
    publicTowns.push({latlng,name});
  }
}

function exportPublicMarkers(){
  if(!currentUser||currentUser.role!=="admin")return;
  downloadJSON(publicMarkers,"publicMarkers.json");
}

function exportPublicTowns(){
  if(!currentUser||currentUser.role!=="admin")return;
  downloadJSON(publicTowns,"publicTowns.json");
}

function downloadJSON(data,name){
  const dataStr="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data,null,2));
  const a=document.createElement("a");
  a.href=dataStr;
  a.download=name;
  a.click();
}

function searchCoords(){
  const val=document.getElementById("coordSearch").value.split(",");
  if(val.length!==2)return;
  const x=parseInt(val[0])-OFFSET_X;
  const z=parseInt(val[1])-OFFSET_Z;
  const lat=ORIGIN-z;
  const lng=x+ORIGIN;
  map.setView([lat,lng],2);
}

function openLogin(){document.getElementById("loginModal").classList.remove("hidden");}
function closeLogin(){document.getElementById("loginModal").classList.add("hidden");}

function login(){
  const u=document.getElementById("username").value;
  const p=document.getElementById("password").value;
  const found=users.find(x=>x.username===u&&x.password===p);
  currentUser=found?found:{username:u,role:"player"};
  document.getElementById("userDisplay").innerHTML=`👤 ${currentUser.username} (${currentUser.role})`;
  if(currentUser.role==="admin"||currentUser.role==="mod")
    document.getElementById("adminTools").style.display="inline";
  closeLogin();
}

window.onload=initMap;
