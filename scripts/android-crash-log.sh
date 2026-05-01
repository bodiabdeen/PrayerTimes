#!/usr/bin/env bash
# Capture Android crash log: run this, then launch the app (or it can start it).
# Usage: ./scripts/android-crash-log.sh   OR   ./scripts/android-crash-log.sh --start

set -e
adb logcat -c
echo "Logcat cleared. Launch the app on the device/emulator now..."
if [[ "${1:-}" == "--start" ]]; then
  adb shell am start -n com.jicprayertimes/.MainActivity
fi
sleep 4
echo "--- Recent logcat (FATAL, ReactNative, app, SoLoader) ---"
adb logcat -d | grep -E "FATAL|AndroidRuntime|ReactNative|ReactNativeJS|com.iomprayertimes|SoLoader|JS Bundle|Error|Exception" | tail -120
