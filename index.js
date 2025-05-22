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
    const payload = {
    student_id: decodedText.trim(),
    type: mode,
    timestamp: new Date().toISOString(),
    counsellor_id: 'unset' // replace with auth email later
    };

    fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
    }).then(r => {
    if (r.ok) flashBackground('#69f0ae');
    else flashBackground('#ff5252');
    }).catch(() => flashBackground('#ff5252'));
}

async function startScanner() {
    try {
    html5QrCode = new Html5Qrcode('reader');
    const cams = await Html5Qrcode.getCameras();
    
    if (!cams.length) throw new Error("No cameras found");

    // Try to find the back-facing one
    const backCam = cams.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
    const camId = backCam ? backCam.id : cams[0].id;

    await html5QrCode.start(
        camId,
        { fps: 12, qrbox: 250 },
        onScanSuccess
    );
    } catch (err) {
    alert('Camera error: ' + err.message);
    console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const modeValue = button.getAttribute('data-mode');
            setMode(modeValue);
        });
    });

    // Start the scanner AFTER DOM is ready
    startScanner();
});

window.setMode = setMode;
//window.addEventListener('load', startScanner);
//window.givePoint = givePoint;
