<div align="center">

# 🏕️ Summer Camp Attendance Scanner

_A lightweight, web-based QR code scanner designed to track attendance (check-in/check-out) and manage engagement points for summer camps. This application uses a mobile-friendly interface to scan QR codes and sends the data in real-time to a Google Sheet via Google Apps Script._

[![Last Commit](https://img.shields.io/badge/last%20commit-today-brightgreen)](https://github.com/horaciog1/check_in_VIL)
[![JavaScript](https://img.shields.io/badge/javascript-35.0%25-blue)]()
[![Languages](https://img.shields.io/badge/languages-6-blue)]()

_Built with the tools and technologies:_

<img src="https://img.shields.io/badge/-JavaScript-yellow?logo=javascript" alt="JavaScript">
<img src="https://img.shields.io/badge/-GNU%20Bash-brightgreen?logo=gnu-bash" alt="Bash">

</div>

---

## 📚 Table of Contents

- [✨ Features](#features)
- [⚙️ Prerequisites](#prerequisites)
- [🛠 Installation & Setup](#installation--setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Frontend Configuration](#2-frontend-configuration)
  - [3. Backend (Google Apps Script)](#3-backend-google-apps-script)
  - [4. Generating QR Codes](#4-generating-qr-codes)
- [🚀 Deployment](#deployment)
  - [🌐 Nginx](#nginx)
- [📱 Usage](#usage)
- [🔐 Security Notes](#security-notes)

---


## ✨ Features

- 🔄 **Multi-Mode Scanning**:
  - 🟢 **Check In / Check Out**: Track arrival and departure times.
  - ⭐ **+1 Point / No Points**: Log participation or engagement points.
- 📡 **Real-Time Sync**: Instant data logging to Google Sheets.
- 🔊 **Audio Feedback**: Distinct sounds for successful scans and point logging.
- 📲 **Mobile Optimized**: Designed for use on mobile devices with rear-facing cameras.
- 🧾 **QR Code Generator**: Includes a Python script to batch generate labeled QR codes from an Excel list.

## ⚙️ Prerequisites

- 🌐 **Web Server**: Nginx (recommended) or any static file server.
- 🔐 **Google Account**: To host the Google Sheet and deploy the Apps Script.
- 🐍 **Python 3.x**: Required for generating QR codes (optional but recommended).

## 🛠 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/horaciog1/check_in_VIL.git
cd check_in_VIL
```

### 2. Frontend Configuration

The scanner needs to know where to send the data. You must configure the Google Apps Script endpoint.

1.  Open `index.js` in a text editor.
2.  Locate the `ENDPOINT` constant at the top of the file.
3.  Replace the empty string with your deployed Google Apps Script Web App URL.

```javascript
// index.js
const ENDPOINT = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

### 3. Backend (Google Apps Script)

You need a Google Apps Script deployed as a Web App to receive the data. The script should handle `GET` requests with the following parameters:

- `student_id`: The ID scanned from the QR code.
- `type`: The mode of the scan (`checkin`, `checkout`, `points`, `nopoints`).
- `timestamp`: ISO8601 timestamp (automatically adjusted to GMT-6 by the frontend).
- `counsellor_id`: Currently defaults to `'unset'`, but can be modified in `index.js`.

**Example `Code.gs` snippet:**

```javascript
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Logs");
  const params = e.parameter;

  sheet.appendRow([
    params.timestamp,
    params.student_id,
    params.type,
    params.counsellor_id
  ]);

  return ContentService.createTextOutput("Success");
}
```

### 4. Generating QR Codes

A Python script `qr.py` is included to generate QR codes labeled with names and IDs from an Excel file.

**Install Dependencies:**

```bash
pip install pandas pillow qrcode openpyxl
```

**Usage:**

Prepare an Excel file (e.g., `students.xlsx`) with columns for student IDs and names.

```bash
python qr.py students.xlsx --id-col student_id --name-col fullName --out-dir qr_codes
```

*Run `python qr.py --help` for more options.*

## 🚀 Deployment

### 🌐 Nginx

A sample deployment script `update.sh` is provided. It pulls the latest changes and copies files to a web server directory.

```bash
# Example usage (adjust paths as needed)
./update.sh
```

Ensure your Nginx configuration points to the directory where the files are copied (e.g., `/var/www/scan.horacioglz.com/`).

## 📱 Usage

1.  Open the hosted `index.html` in a web browser (Chrome or Safari on mobile recommended).
2.  Grant camera permissions when prompted.
3.  Tap **Start scanning** to activate the camera.
4.  Select a mode from the buttons below the scanner view:
    - 🟢 **Check In** / **Check Out**
    - ⭐ **+1 Point** / **No Points**
5.  Point the camera at a student's QR code.
6.  Listen for the confirmation sound and watch for the green screen flash indicating a successful log.

## 🔐 Security Notes

This project uses a public Apps Script Web App endpoint by default. Anyone with the URL can send requests.

Recommended:
- 🔑 Require an API key (shared secret) and verify it in Apps Script
- 📊 Restrict the Sheet access and monitor logs
- 📮 Consider POST + JSON, not GET query params

## 📄 License

This project is open-source. Feel free to modify and adapt it for your needs.
