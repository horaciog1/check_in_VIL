/* === CONFIG === */
const ENDPOINT = "https://script.google.com/macros/s/AKfycby6jIMM08QyB2_MhUqxD1uiD5IumluQOdR_m1tGRZZzlFuZ5bJooPLdPWajefYNav2o/exec";
/* =============== */

let mode = null;
let html5QrCode;

function setMode(m) {
    mode = m;
    const pretty = m === 'checkin' ? 'Check In' : m === 'checkout' ? 'Check Out' : '+1 Point';
    document.getElementById('status').innerText = `Mode: ${pretty}`;
    flashBackground('#00e676');
}

function flashBackground(color) {
    const original = document.body.style.background;
    document.body.style.background = color;
    setTimeout(() => (document.body.style.background = ''), 180);
}

function onScanSuccess(decodedText) {
    if (!mode) { flashBackground('#ff5252'); return; }

    // const payload = {
    // student_id: decodedText.trim(),
    // type: mode,
    // timestamp: new Date().toISOString(),
    // counsellor_id: 'unset' // replace with auth email later
    // };

    // fetch(ENDPOINT, {
    //     method: 'POST',
    //     body: JSON.stringify(payload)
    // })
    // --- build query string for a GET ---
    const qs = new URLSearchParams({
        student_id: decodedText.trim(),
        type: mode,
        timestamp: new Date().toISOString(),
        counsellor_id: 'unset'
    });
      
    fetch(`${ENDPOINT}?${qs}`, {  // ENDPOINT can be the original …/exec
        mode: 'no-cors'             // <- bypass CORS check
    })

    .then(() => flashBackground('#69f0ae')) // always green; you know it reached the server
    
    .catch(err => {
        console.error(err);
        flashBackground('#ff5252');           // network failure (rare)
    });
}

async function startScanner() {
    try {
      html5QrCode = new Html5Qrcode('reader');

      const qrSide = Math.min(window.innerWidth, 300) * 0.7;

      await html5QrCode.start(
        { facingMode: { exact: "environment" } },
        { fps: 12, qrbox: qrSide },
        onScanSuccess
      );
    } catch (err) {
      if (err.name === "OverconstrainedError") {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: qrSide },
          onScanSuccess
        );
      } else if (err.name === "NotAllowedError") {
        alert("Camera permission denied — enable it in browser settings.");
      } else if (err.name === "NotFoundError") {
        alert("No camera found on this device.");
      } else {
        alert("Camera error: " + err.message);
      }
      console.error(err);
    }
  }
  
  /* ───────────────────────── user-gesture wiring ───────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const startBtn  = document.getElementById('startBtn');
    const controls  = document.querySelector('.controls');
    const readerBox = document.getElementById('reader');
  
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      await startScanner();          // runs inside the tap handler → allowed
      startBtn.style.display = 'none';
      controls.style.display = 'flex';
      readerBox.style.display = 'block';
    });
  
    document.querySelectorAll('[data-mode]').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.mode))
    );
  });  

window.setMode = setMode;
//window.addEventListener('load', startScanner);
//window.givePoint = givePoint;
