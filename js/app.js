import * as astronomia from 'https://cdn.jsdelivr.net/npm/astronomia@latest/lib/index.min.js';

let lat, lon;

window.onload = () => {
  startClock();
  getLocation();
};

// ================= GPS =================
function getLocation(){
  navigator.geolocation.getCurrentPosition(async (p)=>{
    lat = p.coords.latitude;
    lon = p.coords.longitude;

    document.getElementById('loc').innerText =
      `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    try{
      let res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      let data = await res.json();
      let a = data.address || {};

      let parts = [
        a.village || a.city || "",
        a.county || "",
        a.state || "",
        a.country || "Indonesia"
      ].filter(v => v && v.trim() !== "");

      document.getElementById('lokasi').innerText =
        `${parts.join(', ')} 🇮🇩`;

    }catch{
      document.getElementById('lokasi').innerText = "📍Tidak tersedia";
    }

    main();
    startCam();

  },{
    enableHighAccuracy:true
  });
}

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

// ================= HILAL =================
function main(){
  try{
    const d = new Date();
    const jd = (d/86400000) + 2440587.5;

    const sun = astronomia.solar.apparentVSOP87(
      astronomia.planetposition.earth, jd
    );

    const moon = astronomia.moonposition.position(jd);

    const elong = Math.acos(
      Math.sin(sun.lat)*Math.sin(moon.lat) +
      Math.cos(sun.lat)*Math.cos(moon.lat) *
      Math.cos(sun.lon - moon.lon)
    ) * 180/Math.PI;

    let alt = (Math.sin(moon.lat) * 90);
    const azi = (moon.lon * 180/Math.PI) % 360;

    const phase = astronomia.moonillum.phaseAngle(sun, moon);
    const age = (phase/360) * 29.53 * 24;

    document.getElementById('alt').innerText = alt.toFixed(2);
    document.getElementById('azi').innerText = azi.toFixed(2);
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

    updateAR(azi, alt);

  }catch(e){
    document.getElementById('status').innerText = "❌ Error";
  }
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'environment' }
  })
  .then(stream=>{
    document.getElementById('cam').srcObject = stream;
  });
}

// ================= AR =================
function updateAR(az, alt){
  const m = document.getElementById('marker');

  let x = (az / 360) * window.innerWidth;
  let y = window.innerHeight/2 - alt * 5;

  m.style.left = x + 'px';
  m.style.top = y + 'px';
}

// ================= NOTIF =================
window.requestNotif = function(){
  Notification.requestPermission();
}
