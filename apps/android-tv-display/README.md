# ANPR TV Display - Android TV Application

## Overview

Android TV Display Client for the ANPR Customer Lookup system. Displays real-time queue information, welcome screens, and customer check-in events on Android TV devices.

**Current Version: 1.0.0 (Mock Mode Only)**

## Architecture

```
ANPR / Check-in
    → Backend API
        → Queue Service
            → Real-time Display Events (SSE)
                → Android TV APK
```

## Technology Choice

**Kotlin + Jetpack Compose for Android TV**

Why not Capacitor:
- Kiosk mode requires native Device Owner APIs
- D-pad navigation needs native TV Compose components
- Immersive mode is unreliable in WebView
- WebSocket stability is critical for always-on displays

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Android TV device or emulator

## Build Instructions

### Debug APK

```bash
cd apps/android-tv-display
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### Release APK

```bash
cd apps/android-tv-display
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release-unsigned.apk`

### Signing for Release

1. Create a keystore:
```bash
keytool -genkey -v -keystore anpr-display-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias anpr-display
```

2. Add to `app/build.gradle.kts`:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("anpr-display-release.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = "anpr-display"
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}
```

## Installation on Android TV

### Method 1: ADB Install
```bash
adb connect <TV_IP_ADDRESS>:5555
adb install app-debug.apk
```

### Method 2: USB Transfer
1. Copy APK to USB drive
2. Plug into Android TV
3. Use file manager to install

### Method 3: Play Store (Future)
- Upload to Google Play Console
- Target Android TV

## First-Time Setup

1. Launch the app
2. Device Setup screen appears
3. Enter settings:
   - **Backend URL**: `http://192.168.1.100:3000`
   - **Device Token**: Your ANPR secret
   - **Branch ID**: Your branch identifier
   - **Screen ID**: Unique screen identifier
   - **Display Mode**: Auto Rotate (recommended)
   - **Language**: Arabic or English
   - **Mock Mode**: Enable for testing without backend
4. Tap "Save and Start"

## Accessing Settings After Setup

Settings are protected by PIN:
1. From the display screen
2. Press **UP, UP, DOWN, DOWN** on remote (or enter PIN when prompted)
3. Enter the PIN (default: `1234`)
4. Settings screen opens

## Display Modes

### Welcome Mode
- Shows check-in animation for each new customer
- Displays customer name, plate, ticket number
- Auto-returns to queue after duration

### Queue Mode
- Shows Now Serving and Waiting lists
- Real-time updates
- Current time display

### Auto Rotate (Recommended)
- Shows Welcome on new check-in
- Returns to Queue after `welcomeDisplayDurationSeconds`
- Best for lobby displays

## Mock Mode

When `DISPLAY_MOCK_MODE=true` (set during setup):
- Generates random check-in events every 15 seconds
- Simulates queue updates
- No backend connection required
- Perfect for demonstrations

## Real-Time Events

The app receives events via Server-Sent Events (SSE):
- `checkin` - New customer check-in
- `queue_update` - Queue list changes
- `call_ticket` - Ticket called for service
- `heartbeat` - Connection keep-alive

### Broadcasting Events

```bash
# Broadcast check-in
curl -X POST http://localhost:3000/api/display/broadcast/checkin \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-01","customerName":"أحمد","plateNumber":"40-00000","lane":"A","ticketNumber":"T-1001"}'

# Broadcast queue update
curl -X POST http://localhost:3000/api/display/broadcast/queue \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-01","nowServing":[{"ticketNumber":"T-1001","customerName":"أحمد","plateNumber":"40-00000","lane":"A"}],"waiting":[{"ticketNumber":"T-1002","customerName":"فاطمة","plateNumber":"25-64831","lane":"B"}]}'

# Broadcast call ticket
curl -X POST http://localhost:3000/api/display/broadcast/call \
  -H "Content-Type: application/json" \
  -d '{"branchId":"branch-01","ticketNumber":"T-1001","customerName":"أحمد","lane":"A"}'
```

## Demo Scenario

### Step 1: Start Backend
```bash
cd /path/to/project
npm install
CUSTOMER_DB_MOCK_MODE=true npm start
```

### Step 2: Build & Install Android App
```bash
cd apps/android-tv-display
./gradlew installDebug
```

### Step 3: Configure Device
- Open app
- Enable Mock Mode in setup
- Save and start

### Step 4: Observe
- Welcome screen appears with random check-ins
- Queue board shows live updates
- All data is simulated

### Step 5: Test with Real Backend
1. Disable Mock Mode in settings
2. Enter backend URL and token
3. Test connection
4. Save and restart

## Privacy Settings

- **Show First Name Only**: Hides last names
- **Hide Phone**: Never displays phone numbers
- **Hide Partial Plate**: Masks plate numbers

## Kiosk Mode Features

- Full screen immersive mode
- Status bar hidden
- Navigation bar hidden
- Screen stays awake
- Back button disabled
- Auto-starts on boot

## File Structure

```
apps/android-tv-display/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/anpr/display/
│       │   ├── AnprDisplayApp.kt
│       │   ├── MainActivity.kt
│       │   ├── data/
│       │   │   ├── local/SettingsRepository.kt
│       │   │   ├── model/
│       │   │   │   ├── ApiModels.kt
│       │   │   │   ├── DeviceConfig.kt
│       │   │   │   └── DisplayEvent.kt
│       │   │   └── remote/
│       │   │       ├── ApiService.kt
│       │   │       └── MockDataProvider.kt
│       │   ├── di/ServiceLocator.kt
│       │   ├── service/
│       │   │   ├── AudioService.kt
│       │   │   ├── BootReceiver.kt
│       │   │   ├── WakeScreenService.kt
│       │   │   └── WebSocketService.kt
│       │   └── ui/
│       │       ├── AnprDisplayApp.kt
│       │       ├── screens/
│       │       │   ├── DeviceSetupScreen.kt
│       │       │   ├── QueueBoardScreen.kt
│       │       │   ├── SettingsScreen.kt
│       │       │   └── WelcomeScreen.kt
│       │       └── theme/Theme.kt
│       └── res/
│           ├── drawable/
│           ├── mipmap-hdpi/
│           ├── raw/ (welcome.mp3, call.mp3)
│           └── values/
├── build.gradle.kts
├── gradle/
├── gradle.properties
└── settings.gradle.kts
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App won't install | Enable "Unknown Sources" in TV settings |
| Black screen | Check if TV supports OpenGL ES 2.0 |
| Can't exit app | Use Settings PIN to access settings |
| No audio | Check TV volume and media settings |
| Connection failed | Verify backend URL and network |

## Limitations (v1.0.0)

- Debug signing only (no production keystore)
- Sound files are placeholder (add your own to `res/raw/`)
- No NVR integration
- No gate control
- No real customer database
- Mock Mode only for current demo

## Next Steps

- [ ] Add production signing configuration
- [ ] Implement OTA updates
- [ ] Add analytics/logging
- [ ] Multi-screen dashboard
- [ ] Voice command support
- [ ] Integration with real ANPR cameras
