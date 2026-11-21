# VidyaOS Frontend v2 (Multi-OS Universal Architecture)

> **Single Codebase, Universal Execution**: Run natively across **Android**, **iOS**, **Windows**, **macOS**, **Linux**, and **Web/PWA** with zero code duplication.

---

## 1. Architectural Highlights

### A. Universal Platform Abstraction (`core/platform.js`)
- **Automatic Runtime & OS Detection**: Detects Android, iOS, Windows, macOS, Linux, Web, and PWA runtimes.
- **Dynamic CSS Hierarchy**: Injects `.platform-*`, `.runtime-*`, `.device-mobile`, `.device-tablet`, and `.device-desktop` classes onto `<html>` to adapt styles without JavaScript re-renders.
- **Hardware Integration**:
  - Android/iOS: Native Back Button lifecycle, Haptics feedback, notch/Dynamic Island safe-area handling (`env(safe-area-inset-top)`), status bar color matching.
  - Windows/macOS/Linux: Custom desktop titlebar with draggable regions (`-webkit-app-region: drag`), macOS traffic lights, Windows/Linux min/max/close controls.
  - Web/PWA: Manifest integration, responsive breakpoints, offline service-worker compatibility.

### B. Adaptive Layout Framework
- **Mobile Viewport (< 768px)**:
  - Pinned 4-Tab Bottom Dock (`Home`, `Classes`, `Classwork`, `Settings`) with tactile haptic feedback.
  - Top header with notch protection and online status badge.
- **Tablet Viewport (768px – 1024px)**:
  - Collapsible 68px Mini-Rail with icon tooltips and compact controls.
- **Desktop Viewport (> 1024px)**:
  - 250px Full Sidebar with role badge, navigation links, and student user card.
  - Desktop titlebar with window frame controls.

### C. Declarative UI Primitives (DEC-001 & UI-001..004)
- **Zero Static Modal HTML**: 656 redundant HTML modal blocks eliminated. Pages call `Dialog.confirm()` or `Dialog.form({ fields: [...] })` with keyboard trapping, `Esc` dismissal, and Android back button interception.
- **Non-blocking Toast Engine**: Swipe/tap to dismiss with auto-timeout and error suppression for clean user feedback.

---

## 2. Directory Structure

```
frontendv2/
├── index.html                   # Universal single entry point with auto-detection & zero-flash shell
├── manifest.webmanifest         # PWA Manifest (standalone display, shortcuts, icons)
├── package.json                 # Project configuration
├── README.md                    # Architecture documentation
├── app.js                       # Application bootstrapper initializing platform, theme, auth, router, and UI
├── core/
│   ├── platform.js              # Universal Platform Abstraction Layer (Android, iOS, Windows, macOS, Linux, Web, PWA)
│   ├── env.js                   # Cross-platform environment configuration
│   ├── storage.js               # Universal Storage Adapter (Capacitor Preferences on mobile, localStorage on web/desktop)
│   ├── api.js                   # Resilient API client (auth headers, in-flight deduplication, error handling)
│   ├── auth.js                  # Cross-platform Auth state & multi-device session takeover
│   ├── router.js                # Universal client-side Router (file://, capacitor://, http://, electron://)
│   ├── event-bus.js             # Lightweight pub/sub for cross-component communication
│   └── updater.js               # Multi-OS Update Engine (strict SemVer, APK direct download on Android)
├── design/
│   ├── tokens.css               # Design tokens (colors, semantic tokens, safe areas, elevation, typography)
│   ├── reset.css                # Cross-OS reset & normalize (touch targets, scrollbars, focus rings)
│   ├── layout.css               # Adaptive grid, responsive containers, desktop titlebar, mobile dock
│   └── components.css           # Declarative component styles (buttons, cards, chips, dialogs, toasts, forms)
├── components/
│   ├── titlebar/                # Multi-OS Desktop Titlebar (Windows/Linux right controls, macOS left traffic lights)
│   ├── navigation/              # Adaptive Navigation (Mobile 4-Tab Bottom Dock, Tablet Mini-Rail, Desktop Full Sidebar)
│   ├── header/                  # Top Header with brand, online indicator, theme toggle, user avatar
│   ├── dialog/                  # Declarative dynamic dialogs (ConfirmDialog, DynamicFormDialog)
│   └── toast/                   # Toast notification system with auto-dismiss and swipe-to-dismiss
├── views/
│   ├── auth/                    # Universal Login view
│   └── student/
│       ├── home/                # Student Cockpit (Up Next lecture, Attendance 75% health, Quick Actions, Enrolled Classes)
│       ├── classes/             # Classes hub (Enrolled courses, faculty, syllabus progress)
│       ├── classwork/           # Classwork / Assignments to-do with submission status
│       ├── profile/             # Responsive Profile (Compact mobile card + Desktop grid layout)
│       └── settings/            # Settings & Account (In-App updates with semver check, bug report modal, support)
└── assets/
    └── icons/                   # Feather/Lucide SVG icons optimized for high-DPI displays
```

---

## 3. How to Run & Test

### Web Browser / Development:
Open `http://localhost:5000/frontendv2/index.html` in Chrome, Safari, Firefox, or Edge.

### Mobile Simulation:
Toggle Mobile Device Mode (384px width, e.g. Pixel 7 / iPhone 15 Pro) to see the bottom navigation dock with 4 canonical tabs and compact card layout.

### Desktop Simulation:
Expand viewport (>1024px) to see the full sidebar, desktop titlebar, and multi-column dashboard grid.
