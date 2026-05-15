# TourMate — Frontend (React Native)

This folder contains the mobile app for TourMate (React Native + TypeScript).

## Quick Overview

- Mobile: React Native (TypeScript)
- Main features: Home (weather + notes + budgets), Map (places), AR (QR-based), Budget management, Notes
- Weather uses Open-Meteo; Place search uses backend proxy to Google Places API

## Prerequisites

- Node.js (16+ recommended)
- npm or yarn
- Android: Java JDK 17 (Temurin/OpenJDK), Android SDK, emulator or device, `adb` on PATH
- iOS: Xcode (macOS) and CocoaPods

## Environment

Set environment variables as needed. The backend exposes APIs and proxies the Google Places key so the app does not hold the server-side key.

## Install & Run (Android)

```bash
cd frontend
npm install
# Start Metro in one terminal
npx react-native start
# Build/run on an Android device/emulator
npx react-native run-android
```

If you run the backend on your development machine and need the app to access it from device/emulator:

```bash
# from the frontend folder
npx react-native adb:reverse tcp:5000 tcp:5000
```

## Important Notes

- Android builds work best with JDK 17 (Temurin). Using older JDK builds may cause Gradle or runtime errors.
- If Home screen search or header overlap occurs, ensure `SafeAreaView` and top spacing are respected; see `src/screens/home/HomeScreen.tsx`.
- For AR: the QR image (used as AR tracking target) is at `src/assets/AR_QR.png` and the expected access key is `AR_KEY_2024_XJKP92_VALID` (the AR screen trims whitespace when comparing).

## Key Folders

- `src/screens/` — screen implementations (Home, Map, AR, Budget, Notes, etc.)
- `src/components/` — shared components (WeatherCard, AppHeader, Skeleton, etc.)
- `src/services/` — API wrappers (places, budgets, notes, auth)
- `src/theme/` — design tokens (colors, spacing, typography)

## Troubleshooting

- Weather: `WeatherCard` prefers GPS then falls back to IP-based geolocation. Ensure location permission is granted.
- QR/AR: If scanning shows "Wrong QR", ensure you are scanning `src/assets/AR_QR.png` (or the printed card) and that camera permission is granted.
- Build failures for Android: confirm JDK 17 and Android SDK, and that network can reach Maven central (DNS/proxy issues can break Gradle downloads).

## Contributing

- Use Fast Refresh during development. Follow existing patterns in `src/`.

If you'd like, I can expand these READMEs with CI, release, or testing instructions.
