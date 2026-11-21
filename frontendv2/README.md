# VidyaOS v2 — Universal React Single-Codebase Suite

VidyaOS v2 is a **100% universal React-based single codebase** targeting:
1. **Web**: Chrome, Safari, Edge, Firefox via Vite + React Native for Web.
2. **Native Mobile**: Pure native Android APK and iOS IPA via React Native / Expo (No Capacitor, No WebViews).
3. **Desktop**: Windows `.exe`, macOS `.dmg`, and Linux `.deb` via Tauri wrapping the React build.

---

## Architecture Overview

```
frontendv2/
├── package.json
├── pnpm-workspace.yaml
│
├── packages/
│   ├── core/                    # 100% SHARED LOGIC & API
│   │   ├── api/client.ts        # Universal fetch client with auto-refresh tokens
│   │   ├── store/authStore.ts   # Reactive user auth & Google 1-Click login
│   │   └── types/index.ts       # TypeScript models (Classroom, Student, User)
│   │
│   └── app/                     # 100% UNIVERSAL SCREENS & COMPONENTS
│       ├── components/          # <ClassroomCard />, <AttendanceGauge />, <Header />, <BottomDock />
│       ├── screens/             # HomeScreen, ClassesScreen, RoutineScreen, SettingsScreen, LoginScreen
│       └── navigation/          # Universal router with Auth Guard & hash sync
│
└── apps/
    ├── web/                     # Web App (Vite + React Native for Web)
    │   └── src-tauri/           # Tauri Desktop Configuration (compiles to .exe)
    │
    └── mobile/                  # Native Mobile App (Expo / React Native)
```

---

## Key Benefits over Legacy v1

- **~85% Less Code to Maintain**: Down from 166,000 lines of repetitive vanilla HTML/CSS/JS to a single clean component library.
- **True Native 60–120 FPS Mobile Experience**: Zero WebViews. Native Android & iOS views.
- **50% Smaller Mobile APK Size**: Drops from ~35 MB down to ~12–16 MB.
- **Ultra-lightweight Desktop App**: Built via Tauri (~12 MB installer vs 120MB+ with Electron).
- **Single Source of Truth**: Updating `<ClassroomCard />` updates Web, Mobile, and Desktop simultaneously.
