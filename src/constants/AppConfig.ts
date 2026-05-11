/**
 * AppConfig
 *
 * App-wide non-visual configuration constants.
 * Keep secrets out of here — use environment variables for sensitive values.
 *
 * ── How the base URL works ────────────────────────────────────────────────────
 * Instead of hard-coding a LAN IP that changes every session, we use `localhost`
 * and rely on `adb reverse` to tunnel the port from the Android device back to
 * this machine. Run once per device connection:
 *
 *   npm run adb:reverse          (in the frontend/ folder)
 *
 * That maps device:5000 → host:5000 and device:5001 → host:5001 so `localhost`
 * works on both physical devices and emulators without ever changing this file.
 *
 * iOS Simulator already routes `localhost` to the host machine natively.
 */
export const AppConfig = {
  appName: 'TourMate',
  appVersion: '1.0.0',

  api: {
    // Works for physical Android (after `npm run adb:reverse`), emulator, and iOS simulator.
    baseUrl: 'http://localhost:5000/api',

    timeoutMs: 15_000,
  },

  auth: {
    sessionTokenKey: '@tourmate/session_token',
    userStorageKey: '@tourmate/session_user',
    biometricKey: '@tourmate/biometric_enabled',
  },
} as const;
