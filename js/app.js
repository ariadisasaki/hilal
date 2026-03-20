console.log("FINAL UI CENTER - BMKG HILAL + HIJRIYAH + NOTIF");

let hijriMonthIndex = 0;
let notifSudah = false;

// INIT
window.onload = ()=>{
  startClock();
  getLocation();
  initSensor();
  setInterval(updateHilal, 1000);
};

// JAM & HIJRIYAH
function startClock(){
  setInterval(()=>{
    let now = new Date();
    let hari = now.toLocaleDateString('id-ID',{weekday:'long'});
    let tanggal = now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    let jam = now.toLocaleTimeString('id-ID').replace(/\./g, ":");
    document.getElementById('waktu').innerText = `${hari}, ${tanggal} - ${jam}`;
  },1000);
}

// GPS & Lokasi
let currentLat = -8.5833, currentLon = 116.1167;
async function getLocation(){
  navigator.geolocation.getCurrentPosition(async p=>{
    currentLat = p.coords.latitude;
    currentLon = p.coords.longitude;
    document.getElementById('loc').innerText = `${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`;

    try{
      let r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLon}&format=json`);
      let d = await r.json();
      let a = d.address||{};
      let lokasi = [
        a.village||a.town||a.city||"",
        a.county||"",
        a.state||"",
        a.country||""
      ].filter(v=>v).join(", ");
      document.getElementById('lokasi').innerText = lokasi;
    }catch{
      document.getElementById('lokasi').innerText = "Lokasi tidak tersedia";
    }

    getHijri(currentLat,currentLon);
    startCam();
  },()=>{ // fallback
    document.getElementById('lokasi').innerText = "Gunakan lokasi default";
    getHijri(currentLat,currentLon);
    startCam();
  },{enableHighAccuracy:true});
}

// HIJRIYAH
function getHijri(lat, lon){
  let now = new Date();
  let maghrib = 18 + (lon/180);
  let jam = now.getHours()+now.getMinutes()/60;
  let tambah = jam>=maghrib?1:0;

  let jd = Math.floor((now/86400000)+2440587.5)+tambah;
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l-1)/10631);
  l = l - 10631*n + 354;
  let j = Math.floor((10985-l)/5316)*Math.floor((50*l)/17719) + Math.floor(l/5670)*Math.floor((43*l)/15238);
  l = l - Math.floor((30-j)/15)*Math.floor((17719*j)/50) - Math.floor(j/16)*Math.floor((15238*j)/43)+29;
  let m = Math.floor((24*l)/709);
  let d = l - Math.floor((709*m)/24);
  let y = 30*n + j - 30;
  const bulan=["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir","Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  hijriMonthIndex = m-1;
  document.getElementById('hijri').innerText = `🕌 ${d} ${bulan[hijriMonthIndex]} ${y} H`;
}

// HILAL OBSERVATORI
function updateHilal(){
  let now = new Date();
  let alt = 10*Math.sin(now.getHours()/24*Math.PI)+5;
  let azi = (now.getHours()*15)%360;
  let elo = 8*Math.abs(Math.sin(now.getHours()/24*Math.PI));
  let age = now.getHours();

  document.getElementById('alt').innerText = alt.toFixed(2);
  document.getElementById('azi').innerText = azi.toFixed(2);
  document.getElementById('elo').innerText = elo.toFixed(2);
  document.getElementById('age').innerText = age.toFixed(1);

  // STATUS
  let status = document.getElementById('status');
  let prediksi = document.getElementById('prediksi');
  const bulan=["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir","Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  let nextMonth = bulan[(hijriMonthIndex+1)%12];

  if(alt>=3 && elo>=6.4){
    status.innerText="✅ Imkan Rukyat";
    status.className="status ok";
    prediksi.innerText=`🌙 Besok kemungkinan awal bulan ${nextMonth}`;
    if(!notifSudah) showNotif("Hilal Terpenuhi",`🌙 Besok kemungkinan awal bulan ${nextMonth}`), notifSudah=true;
  }else{
    status.innerText="❌ Belum Memenuhi";
    status.className="status no";
    prediksi.innerText="⏳ Hilal belum terlihat (istikmal ke-30)";
  }
}

// SENSOR AR
function initSensor(){
  window.addEventListener("deviceorientation",e=>{
    updateAR(e.alpha||0,e.beta||0);
  });
}
function updateAR(h,t){
  let m=document.getElementById('marker');
  let x=window.innerWidth/2+(0-h)*4;
  let y=window.innerHeight/2-(0-t)*4;
  m.style.left=x+"px";
  m.style.top=y+"px";
}

// CAMERA
function startCam(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
  .then(s=>document.getElementById('cam').srcObject=s)
  .catch(()=>{});
}

// NOTIFIKASI
function requestNotif(){
  Notification.requestPermission().then(p=>{
    if(p==="granted") showNotif("Notifikasi Aktif","🔔 Notifikasi berhasil diaktifkan");
    else alert("Notifikasi ditolak");
  });
}
function showNotif(judul,pesan){
  if(Notification.permission==="granted"){
    new Notification(judul,{body:pesan,icon:"icon.png"});
  }
}
