console.log("APP FINAL BMKG LEVEL");

// ================= GLOBAL =================
let hijriMonthIndex = 0;
let notifSudah = false;

let deviceHeading = 0;
let deviceTilt = 0;

let moonAz = 0;
let moonAlt = 0;

// ================= INIT =================
window.onload = () => {
  startClock();
  getLocation();
  initSensor();

  setTimeout(()=>{
    showNotif("Hilal Observatory", "Aplikasi siap digunakan 🌙");
  },2000);
};

// ================= JAM =================
function startClock(){
  setInterval(()=>{
    let now = new Date();

    let hari = now.toLocaleDateString('id-ID',{weekday:'long'});
    let tanggal = now.toLocaleDateString('id-ID',{
      day:'numeric', month:'long', year:'numeric'
    });

    let jam = now.toLocaleTimeString('id-ID');

    document.getElementById('waktu').innerText =
      `${capitalize(hari)}, ${tanggal} - Pkl. ${jam}`;
  },1000);
}

function capitalize(s){
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ================= SENSOR =================
function initSensor(){

  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {

    DeviceOrientationEvent.requestPermission()
      .then(p => {
        if (p === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      });

  } else {
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
}

function handleOrientation(event){

  let heading = event.alpha;

  if (event.webkitCompassHeading) {
    heading = event.webkitCompassHeading;
  }

  deviceHeading = heading || 0;
  deviceTilt = event.beta || 0;

  updateAR();
}

// ================= AR =================
function updateAR(){

  const marker = document.getElementById('marker');

  let deltaAz = moonAz - deviceHeading;

  if(deltaAz > 180) deltaAz -= 360;
  if(deltaAz < -180) deltaAz += 360;

  let deltaAlt = moonAlt - deviceTilt;

  let x = window.innerWidth/2 + (deltaAz * 4);
  let y = window.innerHeight/2 - (deltaAlt * 4);

  marker.style.left = x + "px";
  marker.style.top = y + "px";
}

// ================= SIDEREAL TIME =================
function getSiderealTime(jd, lon){
  let T = (jd - 2451545.0) / 36525;
  let GST = 280.46061837 +
            360.98564736629 * (jd - 2451545) +
            T*T*(0.000387933 - T/38710000);

  let LST = (GST + lon) % 360;
  if(LST < 0) LST += 360;

  return LST;
}

// ================= GPS =================
function getLocation(){
  navigator.geolocation.getCurrentPosition(async (p)=>{

    let lat = p.coords.latitude;
    let lon = p.coords.longitude;

    document.getElementById('loc').innerText =
      `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    try{
      let res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      let data = await res.json();
      let a = data.address || {};

      let parts = [
        a.village || a.suburb || a.town || a.city || "",
        a.county || "",
        a.state || "",
        a.country || ""
      ].filter(v => v && v.trim() !== "");

      parts = [...new Set(parts)];
      parts = parts.map(p => p.replace(/^Kabupaten\s|^Kota\s/i,""));

      document.getElementById('lokasi').innerText =
        `📍${parts.join(', ')}`;

    }catch{
      document.getElementById('lokasi').innerText = "📍Tidak tersedia";
    }

    getHijri(lat, lon);
    hitungHilalAkurat(lat, lon);
    startCam();

  },{
    enableHighAccuracy:true
  });
}

// ================= HILAL AKURAT =================
function hitungHilalAkurat(lat, lon){

  let now = new Date();
  let jd = (now/86400000) + 2440587.5;

  const sun = astronomia.solar.apparentVSOP87(
    astronomia.planetposition.earth, jd
  );

  const moon = astronomia.moonposition.position(jd);

  // RA & Dec
  let ra = Math.atan2(
    Math.sin(moon.lon)*Math.cos(23.44*Math.PI/180) - Math.tan(moon.lat)*Math.sin(23.44*Math.PI/180),
    Math.cos(moon.lon)
  );

  let dec = Math.asin(
    Math.sin(moon.lat)*Math.cos(23.44*Math.PI/180) +
    Math.cos(moon.lat)*Math.sin(23.44*Math.PI/180)*Math.sin(moon.lon)
  );

  ra = ra * 180/Math.PI;
  dec = dec * 180/Math.PI;

  // Sidereal Time
  let LST = getSiderealTime(jd, lon);

  let HA = (LST - ra);
  if(HA < 0) HA += 360;

  // Altitude
  let alt = Math.asin(
    Math.sin(lat*Math.PI/180)*Math.sin(dec*Math.PI/180) +
    Math.cos(lat*Math.PI/180)*Math.cos(dec*Math.PI/180)*Math.cos(HA*Math.PI/180)
  ) * 180/Math.PI;

  // Refraction correction
  if(alt > -1){
    alt += 0.016 / Math.tan((alt+7.31/(alt+4.4))*Math.PI/180);
  }

  // Azimuth
  let az = Math.acos(
    (Math.sin(dec*Math.PI/180) - Math.sin(alt*Math.PI/180)*Math.sin(lat*Math.PI/180)) /
    (Math.cos(alt*Math.PI/180)*Math.cos(lat*Math.PI/180))
  ) * 180/Math.PI;

  if(Math.sin(HA*Math.PI/180) > 0){
    az = 360 - az;
  }

  // Elongasi
  let elong = Math.acos(
    Math.sin(sun.lat)*Math.sin(moon.lat) +
    Math.cos(sun.lat)*Math.cos(moon.lat) *
    Math.cos(sun.lon - moon.lon)
  ) * 180/Math.PI;

  // Umur bulan
  let phase = astronomia.moonillum.phaseAngle(sun, moon);
  let age = (phase/360) * 29.53 * 24;

  moonAz = az;
  moonAlt = alt;

  document.getElementById('alt').innerText = alt.toFixed(2);
  document.getElementById('azi').innerText = az.toFixed(2);
  document.getElementById('elo').innerText = elong.toFixed(2);
  document.getElementById('age').innerText = age.toFixed(1);

  let statusEl = document.getElementById('status');

  if(alt >= 3 && elong >= 6.4){
    statusEl.innerText = '✅ Imkan Rukyat';
    statusEl.className = 'status ok';
  } else {
    statusEl.innerText = '❌ Belum Memenuhi';
    statusEl.className = 'status no';
  }

  updateAR();
}

// ================= HIJRIYAH =================
function getHijri(lat, lon){

  let now = new Date();
  let maghrib = 18 + (lon / 180);
  let currentHour = now.getHours() + now.getMinutes()/60;

  let tambahHari = currentHour >= maghrib ? 1 : 0;

  let jd = Math.floor((now/86400000)+2440587.5) + tambahHari;

  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1)/10631);
  l = l - 10631*n + 354;

  let j = (Math.floor((10985 - l)/5316)) *
          (Math.floor((50*l)/17719)) +
          (Math.floor(l/5670)) *
          (Math.floor((43*l)/15238));

  l = l - (Math.floor((30 - j)/15)) *
      (Math.floor((17719*j)/50)) -
      (Math.floor(j/16)) *
      (Math.floor((15238*j)/43)) + 29;

  let m = Math.floor((24*l)/709);
  let d = l - Math.floor((709*m)/24);
  let y = 30*n + j - 30;

  const bulan = [
    "Muharram","Safar","Rabiul Awal","Rabiul Akhir",
    "Jumadil Awal","Jumadil Akhir","Rajab","Syaban",
    "Ramadhan","Syawal","Zulkaidah","Zulhijjah"
  ];

  hijriMonthIndex = m - 1;

  document.getElementById('hijri').innerText =
    `🕌 ${d} ${bulan[hijriMonthIndex]} ${y} H`;
}

// ================= NOTIF =================
function requestNotif(){

  if(Notification.permission === "denied"){
    alert("❌ Notifikasi diblokir");
    return;
  }

  Notification.requestPermission().then(p=>{
    if(p === "granted"){
      showNotif("Notifikasi Aktif","🔔 Aktif");
    }
  });
}

function showNotif(judul, pesan){
  if(Notification.permission === "granted"){
    new Notification(judul,{
      body: pesan,
      icon: "icon.png"
    });
  }
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'environment' }
  })
  .then(stream=>{
    document.getElementById('cam').srcObject = stream;
  })
  .catch(()=>{});
}
