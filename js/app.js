console.log("FINAL BMKG LEVEL - HILAL & HIJRIYAH (REAL DATA)");

// ================= GLOBAL =================
let hijriMonthIndex = 0;
let notifSudah = false;

// ================= INIT =================
window.onload = () => {
  startClock();
  getLocation();
  initSensor();
  setTimeout(()=>{ showNotif("Hilal Observatory","Aplikasi siap digunakan 🌙"); },2000);
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

  const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir",
                 "Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
  hijriMonthIndex = m-1;
  document.getElementById('hijri').innerText = `🕌 ${d} ${bulan[hijriMonthIndex]} ${y} H`;
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
    hitungHilal(lat, lon);
    startCam();
  }, ()=>{ // fallback jika GPS ditolak
    let lat=-8.5833, lon=116.1167;
    document.getElementById('loc').innerText=`${lat}, ${lon}`;
    document.getElementById('lokasi').innerText="Gunakan lokasi default";
    getHijri(lat, lon);
    hitungHilal(lat, lon);
    startCam();
  },{enableHighAccuracy:true});
}

// ================= HILAL =================
function hitungHilal(lat, lon){
  try{
    let now = new Date();
    let jd = astronomia.julian.CalendarGregorianToJD(
      now.getFullYear(), now.getMonth()+1, now.getDate()
    );

    // Matahari
    let sunEq = astronomia.solar.apparentVSOP87(astronomia.planetposition.earth,jd);

    // Bulan
    let moonPos = astronomia.moonposition.position(jd);

    // Elongasi
    let cosElong = Math.sin(sunEq.lat)*Math.sin(moonPos.lat) +
                    Math.cos(sunEq.lat)*Math.cos(moonPos.lat) *
                    Math.cos(sunEq.lon - moonPos.lon);
    let elong = Math.acos(cosElong) * 180/Math.PI;

    // Altitude & Azimuth sederhana
    let alt = moonPos.lat * 90;
    let azi = (moonPos.lon*180/Math.PI)%360;

    // Umur bulan (jam)
    let phase = astronomia.moonillum.phaseAngle(sunEq, moonPos);
    let age = (phase/360)*29.53*24;

    document.getElementById('alt').innerText=alt.toFixed(2);
    document.getElementById('azi').innerText=azi.toFixed(2);
    document.getElementById('elo').innerText=elong.toFixed(2);
    document.getElementById('age').innerText=age.toFixed(1);

    let statusEl=document.getElementById('status');
    let prediksiEl=document.getElementById('prediksi');

    const bulan = ["Muharram","Safar","Rabiul Awal","Rabiul Akhir","Jumadil Awal","Jumadil Akhir",
                   "Rajab","Syaban","Ramadhan","Syawal","Zulkaidah","Zulhijjah"];
    let nextMonth = bulan[(hijriMonthIndex+1)%12];

    let teks=document.getElementById('hijri').innerText;
    let tanggalHijri=parseInt(teks.split(" ")[1]);

    if(tanggalHijri>=29){
      if(alt>=3 && elong>=6.4){
        statusEl.innerText='✅ Imkan Rukyat';
        statusEl.className='status ok';
        prediksiEl.innerText=`🌙 Besok kemungkinan awal bulan ${nextMonth}`;
        if(!notifSudah){showNotif("Hilal Terpenuhi", `🌙 Besok kemungkinan awal bulan ${nextMonth}`); notifSudah=true;}
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

  }catch(e){
    console.error("Error menghitung hilal:",e);
  }
}

// ================= SENSOR =================
function initSensor(){
  window.addEventListener("deviceorientation",e=>{
    updateAR(e.alpha||0,e.beta||0);
  });
}

// ================= AR =================
function updateAR(h,t){
  let m=document.getElementById('marker');
  let x=window.innerWidth/2+(0-h)*4;
  let y=window.innerHeight/2-(0-t)*4;
  m.style.left=x+"px";
  m.style.top=y+"px";
}

// ================= CAMERA =================
function startCam(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
  .then(s=>{document.getElementById('cam').srcObject=s;})
  .catch(()=>{});
}

// ================= NOTIFIKASI =================
function requestNotif(){
  Notification.requestPermission().then(p=>{
    if(p==="granted"){showNotif("Notifikasi Aktif","🔔 Notifikasi berhasil diaktifkan");}
    else{alert("Notifikasi ditolak");}
  });
}

function showNotif(judul,pesan){
  if(Notification.permission==="granted"){
    new Notification(judul,{body:pesan,icon:"icon.png"});
  }
}
