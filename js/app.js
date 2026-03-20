let lat, lon;

// ===============================
// 📍 Ambil GPS + Nama Lokasi
// ===============================
navigator.geolocation.getCurrentPosition(async (p)=>{
  lat = p.coords.latitude;
  lon = p.coords.longitude;

  // tampilkan koordinat
  document.getElementById('loc').innerText =
    `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  // ambil nama lokasi (reverse geocoding)
  let lokasiText = "📍Mendeteksi lokasi...";
  try{
    let res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    let data = await res.json();

    let a = data.address || {};

    // susun lokasi
    let desa = a.village || a.town || a.city || a.hamlet || "";
    let kab = a.county || "";
    let prov = a.state || "";
    let negara = a.country || "Indonesia";

    // rapikan (hapus kosong & koma berantakan)
    let parts = [desa, kab, prov, negara]
      .filter(v => v && v.trim() !== "");

    lokasiText = `📍${parts.join(', ')} 🇮🇩`;

  }catch(e){
    lokasiText = "📍Lokasi tidak tersedia";
  }

  document.getElementById('lokasi').innerText = lokasiText;

  // jalankan fitur utama
  main();
  startCam();

  // jalankan jam realtime
  startClock();
}, err=>{
  alert("❌ GPS tidak diizinkan");
}, {
  enableHighAccuracy: true,
  timeout: 10000
});


// ===============================
// 🕒 JAM REALTIME
// ===============================
function startClock(){
  setInterval(()=>{
    let now = new Date();

    let hari = now.toLocaleDateString('id-ID', { weekday:'long' });
    let tanggal = now.toLocaleDateString('id-ID', {
      day:'numeric',
      month:'long',
      year:'numeric'
    });

    let jam = now.toLocaleTimeString('id-ID');

    document.getElementById('waktu').innerText =
      `${capitalize(hari)}, ${tanggal} - Pkl. ${jam}`;

  }, 1000);
}

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// ===============================
// 🌙 PERHITUNGAN HILAL
// ===============================
function main(){
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

  if(alt > -1){
    alt += 0.016 / Math.tan((alt+7.31/(alt+4.4))*Math.PI/180);
  }

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
}


// ===============================
// 📷 CAMERA AR
// ===============================
function startCam(){
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'environment' }
  })
  .then(stream => {
    document.getElementById('cam').srcObject = stream;
  });
}


// ===============================
// 🧭 AR MARKER
// ===============================
function updateAR(az, alt){
  const m = document.getElementById('marker');

  let x = (az / 360) * window.innerWidth;
  let y = window.innerHeight/2 - alt * 6;

  m.style.left = x + 'px';
  m.style.top = y + 'px';
}


// ===============================
// 🔔 NOTIFIKASI
// ===============================
function requestNotif(){
  Notification.requestPermission();
}
