# VidyaOS Fingerprint Attendance + Wi-Fi UI

## Open
Extract the ZIP and open `index.html` in a modern browser.

## Demo features
- Student roster (registration UI removed) and search
- Fingerprint enrollment simulation for roster students
- Attendance scan simulation: only enrolled students can mark attendance; duplicate same-day entries are blocked
- Attendance log and CSV export
- Wi-Fi scan preview, password prompt, connect-state simulation, add network, set default network
- ESP32 terminal cards, demo controls, activity log and settings
- Local browser persistence for roster enrollment state, attendance and Wi-Fi names/status/default (passwords are not persisted)

## Hardware limitation
This is a frontend demonstration. Browser pages cannot scan nearby Wi-Fi radio networks, connect to operating-system Wi-Fi, or read a fingerprint sensor directly. Real operation requires the VidyaOS backend/device API and ESP32/fingerprint hardware. The uploaded ZIP did not include the backend or the referenced `esp32-devices.js` integration file, so the page does not pretend to perform real hardware actions.
