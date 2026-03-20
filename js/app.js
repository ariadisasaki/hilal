// ================= INIT =================
window.onload = () => {
  startClock();
  getLocation();
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

// ================= GPS =================
function getLocation(){
  navigator.geolocation.getCurrentPosition(async (p)=>{
    let lat = p.coords.latitude;
    let lon = p.coords.longitude;

    document.getElementById('loc').innerText =
      `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    // lokasi nama
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

    // hitung hilal sederhana
    hitungHilal(lat, lon);

    startCam();

  }, ()=>{
    alert("Aktifkan GPS");
  },{
    enableHighAccuracy:true
  });
}

// ================= HILAL SIMPLE =================
function hitungHilal(lat, lon){
  let now = new Date();

  // simulasi sederhana (biar pasti tampil dulu)
  let alt = Math.random()*10;
  let azi = Math.random()*360;
  let elo = Math.random()*15;
  let age = Math.random()*24;

  document.getElementById('alt').innerText = alt.toFixed(2);
  document.getElementById('azi').innerText = azi.toFixed(2);
  document.getElementById('elo').innerText = elo.toFixed(2);
  document.getElementById('age').innerText = age.toFixed(1);

  let statusEl = document.getElementById('status');

  if(alt >= 3 && elo >= 6.4){
    statusEl.innerText = '✅ Imkan Rukyat';
    statusEl.className = 'status ok';
  } else {
    statusEl.innerText = '❌ Belum Memenuhi';
    statusEl.className = 'status no';
  }

  updateAR(azi, alt);
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'environment' }
  })
  .then(stream=>{
    document.getElementById('cam').srcObject = stream;
  })
  .catch(()=>{
    console.log("Camera tidak diizinkan");
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
function requestNotif(){
  Notification.requestPermission();
}
