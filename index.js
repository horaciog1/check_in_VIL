/* === CONFIG === */

// Here goes the URL/endpoint for the google spreadsheet https://script.google.com/macros/...../exec
const ENDPOINT = "";

/* =============== */

const FLASH_DURATION_MS = 600;
const DEDUP_WINDOW_MS   = 3000;
const STATUS_RESET_MS   = 2000;

/**
 * Return an ISO8601 timestamp in GMT-6 by subtracting 6h from UTC.
 * e.g. "2025-05-28T14:36:09.397-06:00"
 */
function getGMT6Timestamp() {
  const msOffset = 6 * 60 * 60 * 1000;
  const gmt6 = new Date(Date.now() - msOffset);
  return gmt6.toISOString().replace(/Z$/, "-06:00");
}

let mode = null;
let lastScannedText = null;
let lastScannedTime = 0;
let codeReader = null;

const scanSound   = new Audio('check-in.wav');
const pointsSound = new Audio('points.wav');
scanSound.preload   = 'auto';
pointsSound.preload = 'auto';

function getStatusEl() {
    return document.getElementById('status');
}

function setStatus(text) {
    getStatusEl().innerText = text;
}

function getModeLabel(m) {
    if      (m === 'checkin')  return 'Check In';
    else if (m === 'checkout') return 'Check Out';
    else if (m === 'points')   return '+1 Point';
    else if (m === 'nopoints') return 'No Points';
    return m;
}

/**
 * Sets the operational mode, updates status display, and highlights the active button.
 */
function setMode(m) {
    mode = m;
    setStatus(`Mode: ${getModeLabel(m)}`);
    flashBackground('#ecb3cb');

    document.querySelectorAll('[data-mode]').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === m);
    });
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
 * Temporarily flashes the background with the given color.
 */
function flashBackground(color) {
    const original = document.body.style.background;
    document.body.style.background = color;
    setTimeout(() => (document.body.style.background = original), FLASH_DURATION_MS);
}

/**
 * Processes the scanned data and triggers appropriate actions.
 */
function onScanSuccess(decodedText) {
    if (!mode) {
        setStatus('Select a mode first');
        flashBackground('#ff5252');
        navigator.vibrate?.([80, 40, 80]);
        return;
    }

    const now = Date.now();
    if (decodedText === lastScannedText && (now - lastScannedTime) < DEDUP_WINDOW_MS) {
        return;
    }
    lastScannedText = decodedText;
    lastScannedTime = now;

    playModeSound();

    const studentId = decodedText.trim();
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(studentId)) {
        setStatus('Invalid QR code — try again');
        flashBackground('#ff5252');
        navigator.vibrate?.([80, 40, 80]);
        return;
    }

    setStatus('Sending…');
    document.body.style.background = '#ff3a3a';

    const qs = new URLSearchParams({
        student_id: studentId,
        type: mode,
        timestamp: getGMT6Timestamp(),
        counsellor_id: 'unset'
    });

    fetch(`${ENDPOINT}?${qs}`, { mode: 'no-cors' })
        .then(() => {
            const label = getModeLabel(mode);
            setStatus(`${label} — Sent!`);
            setTimeout(() => setStatus(`Mode: ${label}`), STATUS_RESET_MS);
            flashBackground('#86f265');
            navigator.vibrate?.(100);
        })
        .catch(err => {
            console.error(err);
            setStatus('Network error — check connection');
            flashBackground('#ff5252');
            navigator.vibrate?.([80, 40, 80]);
        });
}

/**
 * Stops the active QR scanner and releases the camera.
 */
function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
    const video = document.getElementById('video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
}

/**
 * Initializes the ZXing QR scanner using the rear-facing camera.
 */
async function startScanner() {
    codeReader = new ZXing.BrowserQRCodeReader();

    try {
        const devices = await codeReader.getVideoInputDevices();
        if (!devices.length) {
            setStatus('No camera found');
            return;
        }

        let selectedDeviceId = devices[0].deviceId;
        for (const device of devices) {
            const label = device.label.toLowerCase();
            if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                selectedDeviceId = device.deviceId;
                break;
            }
        }

        codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            'video',
            (result, err) => {
                if (result) {
                    onScanSuccess(result.getText());
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.warn("ZXing error:", err);
                }
            }
        );

    } catch (error) {
        console.error("ZXing scanner error:", error);
        setStatus('Camera access denied — check permissions');
    }
}


/* ───────────────────────── user-gesture wiring ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const startBtn        = document.getElementById('startBtn');
    const backBtn         = document.getElementById('backBtn');
    const controlsSection = document.querySelector('.controls-section');
    const formLinks       = document.getElementById('formLinks');
    const readerBox       = document.getElementById('reader');
    const statusEl        = document.getElementById('status');

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        formLinks.style.display       = 'none';
        readerBox.style.display       = 'block';
        await startScanner();
        startBtn.style.display        = 'none';
        controlsSection.style.display = 'flex';
    });

    backBtn.addEventListener('click', () => {
        stopScanner();
        mode = null;
        lastScannedText = null;
        document.body.style.background = '';
        readerBox.style.display        = 'none';
        controlsSection.style.display  = 'none';
        formLinks.style.display        = '';
        startBtn.disabled              = false;
        startBtn.style.display         = '';
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        statusEl.innerHTML             = 'Tap <strong>Start</strong>, then choose a mode';
    });

    document.querySelectorAll('[data-mode]')
      .forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
});

window.setMode = setMode;
