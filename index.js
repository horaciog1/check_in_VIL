/* === CONFIG === */

// Here goes the URL/endpoint for the google spreadsheet https://script.google.com/macros/...../exec
const ENDPOINT = "";

/* =============== */


/**
 * Return an ISO8601 timestamp in GMT-6 by subtracting 6h from UTC.
 * e.g. "2025-05-28T14:36:09.397-06:00"
 */
function getGMT6Timestamp() {
  // subtract 6 hours (6*60*60*1000 ms) from the UTC-based clock
  const msOffset = 6 * 60 * 60 * 1000;
  // Make a Date at UTC now minus 6h:
  const gmt6 = new Date(Date.now() - msOffset);
  // toISOString() gives "YYYY-MM-DDTHH:mm:ss.sssZ"
  // swap the trailing "Z" for "-06:00"
  return gmt6.toISOString().replace(/Z$/, "-06:00");
}

let mode = null;
let html5QrCode;
let lastScannedText = null;
let lastScannedTime = 0;
const scanSound = new Audio('check-in.wav');
const pointsSound = new Audio('points.wav');
scanSound.preload   = 'auto';
pointsSound.preload = 'auto';

/**
 * Sets the operational mode and updates the status display accordingly.
 *
 * @param {string} m - The mode to set. Expected values are 'checkin', 'checkout', or other strings representing custom modes.
 * @return {void} This method does not return a value.
 */
function setMode(m) {
    mode = m;
    let pretty;
    if      (m === 'checkin')  pretty = 'Check In';
    else if (m === 'checkout') pretty = 'Check Out';
    else if (m === 'points')   pretty = '+1 Point';
    else if (m === 'nopoints') pretty = 'No Points';
    else                        pretty = m;
    document.getElementById('status').innerText = `Mode: ${pretty}`;
    flashBackground('#ecb3cb');
}

function playModeSound() {
  if (mode === 'checkin' || mode === 'checkout') {
    scanSound.currentTime = 0;
    scanSound.play().catch(console.warn);
  } else if (mode === 'points' || mode === 'nopoints') {
    pointsSound.currentTime = 0;
    pointsSound.play().catch(console.warn);
  }
}

/**
 * Temporarily flashes the background of the document's body with the given color.
 *
 * @param {string} color - The color to flash the background with. It should be a valid CSS color value.
 * @return {void} This function does not return a value.
 */
function flashBackground(color) {
    const original = document.body.style.background;
    document.body.style.background = color;
    setTimeout(() => (document.body.style.background = ''), 600);
}

/**
 * Processes the scanned data and triggers appropriate actions based on the scanned result.
 *
 * @param {string} decodedText - The text decoded from the scanned input.
 * @return {void} - This function does not return any value.
 */
function onScanSuccess(decodedText) {
    if (!mode) {
        flashBackground('#ff5252');
        return;
    }


    // ignore duplicates for 3s == 3000
    const now = Date.now();
    if (decodedText === lastScannedText && (now - lastScannedTime) < 3000) {
      return;
    }
    lastScannedText = decodedText;
    lastScannedTime = now;

    // play the check-in sound
    // scanSound.currentTime = 0;
    // scanSound.play().catch(console.warn);

    // Play corresponding sound
    playModeSound();

    // show persistent "processing..." red
    document.body.style.background = '#ff3a3a';

    //  build query string for a GET 
    const qs = new URLSearchParams({
        student_id: decodedText.trim(),
        type: mode,
        // use GMT-6 timestamp instead of UTC
        timestamp: getGMT6Timestamp(),
        counsellor_id: 'unset'
    });

    fetch(`${ENDPOINT}?${qs}`, {  // ENDPOINT is the …/exec
        mode: 'no-cors'             // <- bypass CORS check
    })

        .then(() => {
            // done processing -> flash green then revert
            flashBackground('#86f265');
        })

        .catch(err => {
            console.error(err);
            flashBackground('#ff5252');           // network failure 
        });
}

/**
 * Initializes a QR code scanner using the ZXing library and attempts to detect and decode QR codes from a video input device.
 *
 * The function tries to find and use the environment-facing (rear) camera to detect QR codes. If no compatible device is available, it alerts the user.
 *
 * @return {Promise<void>} A promise that resolves when the scanner starts successfully, or logs an error if initialization fails.
 */
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
    const startBtn        = document.getElementById('startBtn');
    const controlsSection = document.querySelector('.controls-section');
    const readerBox       = document.getElementById('reader');

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        readerBox.style.display       = 'block'; 
        await startScanner();
        startBtn.style.display        = 'none';
        controlsSection.style.display = 'flex';
    });

    document.querySelectorAll('[data-mode]')
      .forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
});

window.setMode = setMode;
