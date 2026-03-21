console.log("FINAL PRO - HILAL REAL API");

// ================= GLOBAL =================
let hijriMonthIndex = 0;
let notifSudah = false;

let hilalData = {
  alt: 0,
  azi: 0
};

let smoothX = 0;
let smoothY = 0;

// ================= ⚠️ API CONFIG (EDIT DI SINI) =================
const API_ID = "ISI_APP_ID_KAMU";
const API_SECRET = "ISI_APP_SECRET_KAMU";

// ================= INIT =================
window.onload = () => {
  startClock();
  getLocation();
  initSensor();

  setTimeout(()=>{
    showNotif("Hilal Checker","Aplikasi siap digunakan 🌙");
  },2000);
};

// ================= JAM =================
function startClock(){
  setInterval(()=>{
    let now = new Date();
    let hari = now.toLocaleDateString('id-ID',{weekday:'long'});
    let tanggal = now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    let jam = now.toLocaleTimeString('id-ID').replace(/\./g,":");
    document.getElementById('waktu').innerText = `${hari}, ${tanggal} - ${jam}`;
  },1000);
}

// ================= HIJRIYAH =================
function getHijri(lat, lon){
  let now = new Date();
  let maghrib = 18 + (lon/180);
  let jam = now.getHours() + now.getMinutes()/60;
  let tambahHari = jam >= maghrib ? 1 : 0;

  let jd = Math.floor((now.getTime()/86400000) + 2440587.5) + tambahHari;

  let l = jd - 1948440 + 10632;
  let n = Math.floor((l-1)/10631);
  l = l - 10631*n + 354;
  let j = (Math.floor((10985-l)/5316))*(Math.floor((50*l)/17719))
        +(Math.floor(l/5670))*(Math.floor((43*l)/15238));
  l = l - (Math.floor((30-j)/15))*(Math.floor((17719*j)/50))
        - (Math.floor(j/16))*(Math.floor((15238*j)/43)) + 29;
  let m = Math.floor((24*l)/709);
  let d = l - Math.floor((709*m)/24);
  let y = 30*n + j - 30;

  const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir","Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  hijriMonthIndex = m-1;

  document.getElementById('hijri').innerText = `🕌 ${d} ${bulan[hijriMonthIndex]} ${y} H`;
}

// ================= 📡 API BULAN REAL =================
async function getRealMoon(lat, lon){
  try{
    let now = new Date().toISOString();

    let res = await fetch("https://api.astronomyapi.com/api/v2/bodies/positions/moon",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Basic " + btoa(07fa7445-3158-4da7-a52f-2e18b56065c9 + ":" + 225d8080cd3274b87beef6e989bb6cff102e2b8b7f0aa0706646422e032894b8a9eabf8aff5c141e4b159b10d9a61a275b011054a7bad7abd377f82928df99f961bc9e2b767243cf29639e5b7658a56ef8e565fa847cfe00fb5973dc40962611c4578b81980349f27804e200ceb5430b)
      },
      body: JSON.stringify({
        format: "json",
        observer: {
          latitude: lat,
          longitude: lon,
          elevation: 0
        },
        datetime: now
      })
    });

    let data = await res.json();

    let moon = data.data.table.rows[0].cells[0];

    let alt = moon.position.horizontal.altitude.degrees;
    let azi = moon.position.horizontal.azimuth.degrees;

    return {alt, azi};

  }catch(e){
    console.log("API gagal, fallback simulasi");
    return null;
  }
}

// ================= GPS =================
function getLocation(){
  navigator.geolocation.getCurrentPosition(async p=>{
    let lat = p.coords.latitude;
    let lon = p.coords.longitude;

    document.getElementById('loc').innerText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    try{
      let r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
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
      document.getElementById('lokasi').innerText="Lokasi tidak tersedia";
    }

    getHijri(lat, lon);
    await hitungHilal(lat, lon);
    startCam();

  }, async ()=>{
    let lat=-8.5833, lon=116.1167;
    document.getElementById('loc').innerText=`${lat}, ${lon}`;
    document.getElementById('lokasi').innerText="Gunakan lokasi default";

    getHijri(lat, lon);
    await hitungHilal(lat, lon);
    startCam();
  },{enableHighAccuracy:true});
}

// ================= 🌙 HILAL =================
async function hitungHilal(lat, lon){

  let now = new Date();

  let real = await getRealMoon(lat, lon);

  let alt, azi;

  if(real){
    alt = real.alt;
    azi = real.azi;
  } else {
    // fallback simulasi
    alt = 5 + Math.sin(now.getHours()/24*Math.PI)*2;
    azi = (now.getHours()*15)%360;
  }

  let elo = 7 + Math.abs(Math.sin(now.getHours()/24*Math.PI))*1.5;
  let age = (now.getHours() % 24) + now.getMinutes()/60;

  hilalData.alt = alt;
  hilalData.azi = azi;

  document.getElementById('alt').innerText=alt.toFixed(2);
  document.getElementById('azi').innerText=azi.toFixed(2);
  document.getElementById('elo').innerText=elo.toFixed(2);
  document.getElementById('age').innerText=age.toFixed(1);

  let statusEl=document.getElementById('status');
  let prediksiEl=document.getElementById('prediksi');

  const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir","Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  let nextMonth = bulan[(hijriMonthIndex+1)%12];

  let teks=document.getElementById('hijri').innerText;
  let tanggalHijri=parseInt(teks.split(" ")[1]);

  if(tanggalHijri>=29){
    if(alt>=3 && elo>=6.4){
      statusEl.innerText='✅ Imkan Rukyat';
      statusEl.className='status ok';
      prediksiEl.innerText=`🌙 Besok kemungkinan awal bulan ${nextMonth}`;

      if(!notifSudah){
        showNotif("Hilal Terpenuhi", `🌙 Besok kemungkinan awal bulan ${nextMonth}`);
        notifSudah=true;
      }

    } else {
      statusEl.innerText='❌ Belum Memenuhi';
      statusEl.className='status no';
      prediksiEl.innerText="⏳ Hilal belum terlihat (istikmal ke-30)";
    }
  } else {
    statusEl.innerText='ℹ️ Belum Akhir Bulan';
    statusEl.className='status';
    prediksiEl.innerText="📅 Masih pertengahan bulan Hijriyah";
  }
}

// ================= SENSOR =================
function initSensor(){
  let lastAlpha = 0;
  let lastBeta = 0;

  window.addEventListener("deviceorientation", e => {

    let alpha = e.alpha || 0;
    let beta = e.beta || 0;

    alpha = lastAlpha + (alpha - lastAlpha) * 0.2;
    beta = lastBeta + (beta - lastBeta) * 0.2;

    lastAlpha = alpha;
    lastBeta = beta;

    updateAR(alpha, beta);
  });
}

// ================= AR =================
function updateAR(alpha, beta){
  let marker = document.getElementById('marker');
  let video = document.getElementById('cam');

  if(!marker || !video) return;

  let rect = video.getBoundingClientRect();

  let diffAzi = hilalData.azi - alpha;

  if(diffAzi > 180) diffAzi -= 360;
  if(diffAzi < -180) diffAzi += 360;

  let x = rect.width/2 + (diffAzi * 3);

  let diffAlt = hilalData.alt - beta;
  let y = rect.height/2 - (diffAlt * 5);

  x = Math.max(0, Math.min(rect.width, x));
  y = Math.max(0, Math.min(rect.height, y));

  smoothX += ((rect.left + x) - smoothX) * 0.2;
  smoothY += ((rect.top + y) - smoothY) * 0.2;

  marker.style.left = smoothX + "px";
  marker.style.top = smoothY + "px";
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
  .then(s=>{
    document.getElementById('cam').srcObject=s;
  })
  .catch(()=>{
    console.log("Kamera tidak diizinkan");
  });
}

// ================= NOTIFIKASI =================
function requestNotif(){
  Notification.requestPermission().then(p=>{
    if(p==="granted"){
      showNotif("Notifikasi Aktif","🔔 Notifikasi berhasil diaktifkan");
    } else {
      alert("Notifikasi ditolak");
    }
  });
}

function showNotif(judul,pesan){
  if(Notification.permission==="granted"){
    new Notification(judul,{body:pesan,icon:"icon.png"});
  }
}
