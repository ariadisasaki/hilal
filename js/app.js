console.log("Hilal Observatory - Final BMKG");

let hijriMonthIndex = 0;
let notifSudah = false;

window.onload = () => {
  startClock();
  getLocation();
  initSensor();
  setTimeout(()=> showNotif("Hilal Observatory", "Aplikasi siap digunakan 🌙"), 2000);
};

// ================= JAM =================
function startClock(){
  setInterval(()=>{
    const now = new Date();
    const hari = now.toLocaleDateString('id-ID',{weekday:'long'});
    const tanggal = now.toLocaleDateString('id-ID',{day:'numeric', month:'long', year:'numeric'});
    const jam = now.toLocaleTimeString('id-ID');
    document.getElementById('waktu').innerText = `${hari}, ${tanggal} - ${jam}`;
  },1000);
}

// ================= HIJRIYAH =================
function getHijri(lat, lon){
  const now = new Date();
  const maghrib = 18 + (lon/180);
  const jam = now.getHours() + now.getMinutes()/60;
  const tambahHari = jam >= maghrib ? 1 : 0;

  let jd = Math.floor((now.getTime()/86400000)+2440587.5)+tambahHari;
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l-1)/10631);
  l = l - 10631*n + 354;
  let j = Math.floor((10985-l)/5316)*Math.floor((50*l)/17719) +
          Math.floor(l/5670)*Math.floor((43*l)/15238);
  l = l - Math.floor((30-j)/15)*Math.floor((17719*j)/50) -
      Math.floor(j/16)*Math.floor((15238*j)/43) + 29;
  let m = Math.floor((24*l)/709);
  let d = l - Math.floor((709*m)/24);
  let y = 30*n + j -30;
  const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir",
                 "Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  hijriMonthIndex = m-1;
  document.getElementById('hijri').innerText = `🕌 ${d} ${bulan[hijriMonthIndex]} ${y} H`;
}

// ================= GPS =================
function getLocation(){
  navigator.geolocation.getCurrentPosition(async p=>{
    const lat = p.coords.latitude;
    const lon = p.coords.longitude;
    document.getElementById('loc').innerText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const d = await r.json();
      const a = d.address || {};
      const lokasi = [a.village||a.town||a.city||"",a.county||"",a.state||"",a.country||""].filter(v=>v).join(", ");
      document.getElementById('lokasi').innerText = lokasi || "Lokasi tidak tersedia";
    }catch{
      document.getElementById('lokasi').innerText = "Lokasi tidak tersedia";
    }

    getHijri(lat, lon);
    hitungHilal(lat, lon);
    startCam();
  },{
    enableHighAccuracy:true
  });
}

// ================= HILAL OBSERVATORIUM =================
function hitungHilal(lat, lon){
  const now = new Date();
  const jd = astronomia.date.julianDate(now);
  const sun = astronomia.solar.apparentVSOP87(astronomia.planetposition.earth, jd);
  const moon = astronomia.moonposition.position(jd);

  // Elongasi
  const elong = Math.acos(
    Math.sin(sun.lat)*Math.sin(moon.lat) +
    Math.cos(sun.lat)*Math.cos(moon.lat) * Math.cos(sun.lon - moon.lon)
  ) * 180/Math.PI;

  // Altitude/Azimuth (sederhana untuk user lat/lon)
  const latRad = lat*Math.PI/180;
  const moonDec = moon.lat;
  const moonRA = moon.lon;
  const lst = 15*now.getUTCHours()+lon; // simplifikasi
  const hourAngle = lst - moonRA;
  const alt = Math.asin(Math.sin(latRad)*Math.sin(moonDec)+Math.cos(latRad)*Math.cos(moonDec)*Math.cos(hourAngle))*180/Math.PI;
  const azi = Math.acos((Math.sin(moonDec)-Math.sin(latRad)*Math.sin(alt*Math.PI/180))/(Math.cos(latRad)*Math.cos(alt*Math.PI/180)))*180/Math.PI;

  const age = (astronomia.moonillum.phaseAngle(sun, moon)/360)*29.53;

  document.getElementById('alt').innerText = alt.toFixed(2);
  document.getElementById('azi').innerText = azi.toFixed(2);
  document.getElementById('elo').innerText = elong.toFixed(2);
  document.getElementById('age').innerText = age.toFixed(1);

  const statusEl = document.getElementById('status');
  const prediksiEl = document.getElementById('prediksi');

  const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir",
                 "Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  const nextMonth = bulan[(hijriMonthIndex+1)%12];

  if(alt>=3 && elong>=6.4){
    statusEl.innerText = '✅ Imkan Rukyat';
    statusEl.className = 'status ok';
    prediksiEl.innerText = `🌙 Besok kemungkinan awal bulan ${nextMonth}`;
    if(!notifSudah){showNotif("Hilal Terpenuhi", `🌙 Besok kemungkinan awal bulan ${nextMonth}`); notifSudah=true;}
  }else{
    statusEl.innerText = '❌ Belum Memenuhi';
    statusEl.className = 'status no';
    prediksiEl.innerText = '⏳ Hilal belum terlihat';
  }

  updateAR(azi, alt);
}

// ================= SENSOR & AR =================
function initSensor(){
  window.addEventListener("deviceorientation", e=>{
    updateAR(e.alpha||0, e.beta||0);
  });
}

function updateAR(h, t){
  const m = document.getElementById('marker');
  const x = window.innerWidth/2 + (0-h)*4;
  const y = window.innerHeight/2 - (0-t)*4;
  m.style.left = x+"px";
  m.style.top = y+"px";
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
  .then(s=>{document.getElementById('cam').srcObject = s;});
}

// ================= NOTIFIKASI =================
function requestNotif(){
  Notification.requestPermission().then(p=>{
    if(p==="granted"){showNotif("Notifikasi Aktif","🔔 Notifikasi berhasil diaktifkan");}
    else{alert("Notifikasi ditolak");}
  });
}

function showNotif(title,msg){
  if(Notification.permission==="granted"){
    new Notification(title,{body:msg,icon:"icon.png"});
  }
}
