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
  console.log("Initializing ZXing scanner...");
  const codeReader = new ZXing.BrowserQRCodeReader();

  try {
    const devices = await codeReader.getVideoInputDevices();
    if (!devices.length) {
      alert("No camera found.");
      return;
    }

    // Try to find the environment-facing (rear) camera
    let selectedDeviceId = devices[0].deviceId; // fallback
    for (const device of devices) {
      if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear') || device.label.toLowerCase().includes('environment')) {
        selectedDeviceId = device.deviceId;
        break;
      }
    }

    console.log("Using camera:", selectedDeviceId);

    codeReader.decodeFromVideoDevice(
      selectedDeviceId,
      'video',
      (result, err) => {
        if (result) {
          const text = result.getText();
          console.log("QR code detected:", text);
          onScanSuccess(text);
        }
    
        if (err && !(err instanceof ZXing.NotFoundException)) {
          console.warn("ZXing error:", err);
        }
      }
    );
    

  } catch (error) {
    console.error("ZXing scanner error:", error);
    alert("Failed to start QR scanner: " + error.message);
  }
}

  
  /* ───────────────────────── user-gesture wiring ───────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const startBtn  = document.getElementById('startBtn');
        const controls  = document.querySelector('.controls');
        const readerBox = document.getElementById('reader');
  
    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
      
        /* 1️⃣ make the reader visible first — gives it real dimensions */
        readerBox.style.display = 'block';
      
        /* 2️⃣ now start the scanner (it will find readerBox 320×320) */
        await startScanner();
      
        /* 3️⃣ reveal the mode buttons */
        startBtn.style.display = 'none';
        controls.style.display = 'flex';
    });
      
    document.querySelectorAll('[data-mode]').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.mode))
    );
  });  

window.setMode = setMode;
