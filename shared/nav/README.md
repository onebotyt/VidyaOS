# 🧭 VidyaOS Navigation & Header System

This dedicated directory (`frontend/shared/nav/`) contains the complete institutional navigation, top header, sidebar, mobile navigation, and page transition architecture.

---

## 📁 Directory Structure
```
frontend/shared/nav/
├── nav.js         # Core modular navigation engine & logic
├── nav.css        # Complete styling, View Transitions, and anti-flash rules
└── README.md      # Architecture documentation (this file)
```

*(Note: These files are also mirrored to `/frontend/shared/js/nav.js` and `/frontend/shared/css/nav.css` so both `/shared/nav/nav.js` and `/js/nav.js` resolve consistently).*

---

## 🚀 Key Features

### 1. 4-Role Unified Architecture
Provides role-tailored workspaces with zero network roundtrips:
- **Admin**: System configuration, academic structure, audit logs, HOD assignments.
- **HOD**: Department overview, faculty rosters, student approvals, registers, marks, department settings.
- **Faculty**: Class hubs, teaching classes drawer, attendance registers, coursework, marksheet tests, evaluation.
- **Student**: Attendance, subjects, timetables, coursework tasks, marks.

### 2. High-Performance Page Transitions
- **View Transitions API**: Header (`.gc-navbar`), sidebar (`#app-sidebar`), and mobile nav (`.mobile-bottom-nav`) remain completely stationary during cross-document navigation.
- **Zero-Lag Loading Bar**: Instant non-blocking top progress indicator (`#vidyaos-nav-progress`).
- **Safe Browser Navigation**: Cross-document requests are never cancelled or blocked, ensuring lightning-fast page switching on all devices (mobile, desktop, low-power devices).

### 3. Responsive Components
- **Top Header (`.gc-navbar`)**: Brand logo, portal badge, apps launcher modal, appearance theme toggle, user avatar.
- **Collapsible Sidebar (`#app-sidebar`)**: Scoped navigation links, live class list, status indicator, logout button.
- **Mobile Bottom Bar (`.mobile-bottom-nav`)**: 4-tab quick-access bar for handheld screens.
- **Apps Launcher (`#apps-launcher-dropdown`)**: Instant quick-switch tiles.
- **User Profile Popover (`#user-profile-popover`)**: Account information and shortcuts.

---

## 🛠️ How to Include on Any Page

In `<head>`:
```html
<link rel="stylesheet" href="/css/nav.css">
```

Before `</body>`:
```html
<script src="/js/nav.js"></script>
```

When using both `auth.js` and `nav.js`, load `auth.js` first, then `nav.js`:
```html
<script src="/js/auth.js"></script>
<script src="/js/nav.js"></script>
```
