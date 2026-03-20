let lat, lon;

navigator.geolocation.getCurrentPosition(p=>{
  lat = p.coords.latitude;
  lon = p.coords.longitude;

  document.getElementById('loc').innerText =
    `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

  main();
  startCam();
});

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

  // refraksi sederhana
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

function startCam(){
  navigator.mediaDevices.getUserMedia({
    video:{ facingMode:'environment' }
  })
  .then(stream => {
    document.getElementById('cam').srcObject = stream;
  });
}

function updateAR(az, alt){
  const m = document.getElementById('marker');

  let x = (az / 360) * window.innerWidth;
  let y = window.innerHeight/2 - alt * 6;

  m.style.left = x + 'px';
  m.style.top = y + 'px';
}

function requestNotif(){
  Notification.requestPermission();
}
