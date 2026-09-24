# Caption Studio Android build

The Android wrapper lives in `frontend/android` and the debug APK is produced at:

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

This debug APK is for testing with your computer as the processing engine. Start
FastAPI on the LAN interface (`0.0.0.0`):

```powershell
cd C:\Users\USER\Documents\ChatGPT\Captions
.\scripts\dev-backend.ps1
```

Keep that terminal open. On the phone, use the same Wi-Fi as the computer and
open `http://<computer LAN IPv4>:8000/api/health` in the phone's browser. It
must show `{"status":"ok","service":"caption-studio-api"}`. If it does not,
check Windows Firewall and whether the Wi-Fi blocks device-to-device traffic.

Build the APK:

```powershell
cd C:\Users\USER\Documents\ChatGPT\Captions\frontend
pnpm run build
pnpm exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

Install `app\build\outputs\apk\debug\app-debug.apk`. On the app's first
screen, enter `http://<computer LAN IPv4>:8000` under Processing engine and tap
**Save & test**. Then choose a short video, wait for transcription, make an edit,
export, and use **Save / share MP4**.

The API address is saved on the phone and can be changed without rebuilding.
This is a debug build that permits unencrypted HTTP on your local Wi-Fi. Do not
publish this APK as a production release or expose the unauthenticated FastAPI
server to the public internet. A shareable production app needs HTTPS hosting,
authentication, storage, and a signed release build.
