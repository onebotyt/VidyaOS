# VidyaOS Frontend — Complete Architecture, Component Isolation & Page-by-Page Reference

> **Zero-Build Vanilla ES6+ Architecture**  
> **Strict 3-Portal Isolation**: `/admin/`, `/faculty/`, and `/student/` share **zero** CSS, JS, or components (`/shared/` has been completely removed).  
> **Security By Isolation**: A logged-in student inspecting browser DevTools (`Sources` / `Network`) cannot see any Admin or Faculty URLs, routes, navigation profiles, or scripts.

## 1. Strict 4-Domain Directory Isolation Architecture

```
VidyaOS-main/
├── index.html                           # Public institutional landing page (loads /login/core/variables.css)
├── vercel.json                          # Vercel Edge routing & API proxy rewrites
├── server.js                            # Zero-dependency local development proxy server (PORT=5000 -> :3000)
├── login/                               # 🟠 Public Auth Domain (Isolated)
│   ├── core/                            # Public auth foundation (variables.css, api.js, auth.js, ui.js)
│   ├── index.html / index.js / index.css# Unified institutional sign-in with cold-start retry engine
│   └── register/                        # Student & Faculty self-registration workflow
├── admin/                               # 🔴 Admin Domain (100% Isolated)
│   ├── components/                      # Admin-only components & core foundation
│   │   ├── core/                        # reset.css, variables.css, api.js (with 3s GET cache), auth.js (Admin-only)
│   │   ├── header/                      # Admin top bar & profile popover
│   │   ├── sidebar/                     # Dual-state Admin navigation rail & mobile drawer
│   │   ├── page-header/                 # Standardized Admin page title & action header
│   │   ├── metrics/                     # KPI metric cards grid
│   │   ├── delete-modal/                # Admin deletion confirmation modal
│   │   ├── icons.js                     # Admin inline SVG icon registry
│   │   ├── admin-base.css               # Admin typography, buttons, forms, tables & modals
│   │   └── admin-ui.js                  # Admin toast & modal controller
│   └── <7 Admin Pages>/                 # dashboard, academic-structure, faculty-management, reports, audit-logs, settings, profile
├── faculty/                             # 🔵 Faculty & HOD Domain (100% Isolated)
│   ├── components/                      # Faculty-only components & core foundation
│   │   ├── core/                        # reset.css, variables.css, api.js, auth.js (Faculty/HOD-only), exceljs.min.js
│   │   ├── header/                      # Faculty top bar, apps launcher & profile popover
│   │   ├── sidebar/                     # Faculty navigation drawer with live Teaching Classes list
│   │   ├── dept-hero/                   # HOD department command banner
│   │   ├── confirm-dialog/              # Action confirmation modal
│   │   ├── delete-modal/                # Faculty deletion safety modal
│   │   ├── dossier/                     # Reusable NBA Dossier & Class Delivery Engine (dossier.css, dossier.js)
│   │   ├── icons.js                     # 60+ Faculty & HOD SVG icons
│   │   ├── faculty-base.css             # Faculty design system base styles
│   │   └── faculty-ui.js                # Faculty toast & modal utilities
│   └── <18 Faculty & HOD Pages>/        # dashboard, classes, group-detail, classwork, registers, sheets, students, etc.
└── student/                             # 🟢 Student Domain (100% Isolated)
    ├── components/                      # Student-only components & core foundation
    │   ├── core/                        # reset.css, variables.css, api.js, auth.js (Student-only), utils.js, classroom-nav.css
    │   ├── header/                      # Student top bar, notification bell & semester badge
    │   ├── sidebar/                     # Student drawer with enrolled classes list
    │   ├── delete-modal/                # Student confirmation modal
    │   ├── dossier/                     # Reusable Student NBA Dossier Engine (dossier.css, dossier.js)
    │   ├── icons.js                     # Student SVG icon registry
    │   ├── student-base.css             # Student base layout & components
    │   └── student-ui.js                # Student toast & UI utilities
    └── <14 Student Pages>/              # dashboard, attendance, assignments, scores, timetable, leave, profile, group-detail, NBA pages
```

## 2. How Core Isolation & API Request Deduplication Work

1. **In-Flight `GET` Request Coalescing & 3-Second Micro-Cache (`/<role>/components/core/api.js`)**:
   - Whenever multiple components on the same page (e.g., `header.js`, `sidebar.js`, and the page controller) request the same `GET` endpoint simultaneously (such as `/students/me`, `/auth/me`, or `/teaching-groups/student/my-groups`), `_inflightGetRequests` coalesces them into a **single HTTP network call** and shares the resolved clone across all callers.
   - Any mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) immediately calls `clearApiCache()` so subsequent reads always fetch fresh state.
2. **Role-Isolated Authentication & RBAC (`/<role>/components/core/auth.js`)**:
   - `admin/components/core/auth.js` only authorizes `['SYSTEM_ADMIN', 'ADMIN']`.
   - `faculty/components/core/auth.js` only authorizes `['TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN']`.
   - `student/components/core/auth.js` only authorizes `['STUDENT']`.
   - `guardRoute()` returns the authenticated `user` object (or redirects to `/login/index.html?reason=unauthorized` if unauthorized) and throttles `/api/v1/auth/me` profile syncs to once every 5 seconds.
3. **Reusable NBA Dossier Engines (`/faculty/components/dossier/` & `/student/components/dossier/`)**:
   - `window.FacultyDossier.mount(config)` powers `/faculty/direct-assessment`, `/faculty/indirect-assessment`, `/faculty/assessment-process`, and `/faculty/student-performance`.
   - `window.FacultyDossier.mountDelivery(config)` powers `/faculty/theory-classes` and `/faculty/lab-classes`.
   - `window.StudentDossier.mount(config)` powers `/student/direct-assessment`, `/student/indirect-assessment`, `/student/assessment-process`, and `/student/student-performance`.

## 3. Complete Page & Component File Map (All 228 Files)

### Domain Section: `/login`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `login/index.css` | 626 | Role-isolated stylesheet |
| `login/index.html` | 212 | Loads: `/login/core/variables.css`, `/login/index.css`, `/login/core/ui.js`, `/login/core/api.js`, `/login/core/auth.js`, `/login/index.js` |
| `login/index.js` | 464 | Page Controller |
| `login/register/index.html` | 321 | Loads: `/login/register/register.css`, `/login/register/register.js` |
| `login/register/register.css` | 470 | Role-isolated stylesheet |
| `login/register/register.js` | 580 | Page Controller |
| `login/core/api.js` | 169 | Exports: `window.handleSessionRevocation`, `window.fetchApi`, `window.apiRequest`, `window.apiFetch`, `window.attemptTokenRefresh`, `window.clearApiCache` |
| `login/core/auth.js` | 47 | Exports: `window.getAuthToken`, `window.getToken`, `window.getAccessToken`, `window.getDeviceId`, `window.setAuthSession`, `window.getCurrentUser` |
| `login/core/ui.js` | 27 | Exports: `window.showToast` |
| `login/core/variables.css` | 249 | Role-isolated stylesheet |

### Domain Section: `/landing`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `landing/index.html` | 1971 | Loads: `/login/core/variables.css` |

### Domain Section: `/admin/components`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `admin/components/README.md` | 172 | Component / Architecture Documentation |
| `admin/components/admin-base.css` | 346 | Role-isolated stylesheet |
| `admin/components/admin-ui.js` | 134 | Exports: `window.escapeHtml`, `window.escHtml`, `window.esc`, `window.showToast`, `window.adminToast`, `window.openModal` |
| `admin/components/icons.js` | 233 | Exports: `window.AdminIcons`, `window.getAdminIcon` |
| `admin/components/core/api.js` | 169 | Exports: `window.handleSessionRevocation`, `window.fetchApi`, `window.apiRequest`, `window.apiFetch`, `window.attemptTokenRefresh`, `window.clearApiCache` |
| `admin/components/core/auth.js` | 330 | Exports: `window.addEventListener`, `window.AdminAuth`, `window.escHtml`, `window.esc`, `window.escapeHtml`, `window.getAuthToken` |
| `admin/components/core/reset.css` | 53 | Role-isolated stylesheet |
| `admin/components/core/variables.css` | 249 | Role-isolated stylesheet |
| `admin/components/delete-modal/delete-modal.css` | 357 | Role-isolated stylesheet |
| `admin/components/delete-modal/delete-modal.html` | 82 | HTML Template Fragment |
| `admin/components/delete-modal/delete-modal.js` | 384 | Exports: `window.showToast` |
| `admin/components/header/header.css` | 342 | Role-isolated stylesheet |
| `admin/components/header/header.html` | 99 | HTML Template Fragment |
| `admin/components/header/header.js` | 264 | Exports: `window.getCurrentUser`, `window.mountAdminHeader`, `window.syncHeaderIdentity`, `window.toggleAdminProfileMenu`, `window.toggleDashboardTheme`, `window.toggleAppTheme` |
| `admin/components/metrics/metrics.css` | 106 | Role-isolated stylesheet |
| `admin/components/metrics/metrics.js` | 130 | Page Controller |
| `admin/components/page-header/page-header.css` | 155 | Role-isolated stylesheet |
| `admin/components/page-header/page-header.js` | 67 | Page Controller |
| `admin/components/sidebar/sidebar.css` | 1665 | Role-isolated stylesheet |
| `admin/components/sidebar/sidebar.html` | 117 | HTML Template Fragment |
| `admin/components/sidebar/sidebar.js` | 551 | Page Controller |

### Domain Section: `/admin`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `admin/index.html` | 12 | HTML Template Fragment |
| `admin/academic-structure/academic-structure.css` | 830 | Role-isolated stylesheet |
| `admin/academic-structure/academic-structure.js` | 460 | Page Controller |
| `admin/academic-structure/index.html` | 276 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/components/page-header/page-header.css`, `/admin/academic-structure/academic-structure.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/academic-structure/academic-structure.js` |
| `admin/audit-logs/audit-logs.css` | 387 | Role-isolated stylesheet |
| `admin/audit-logs/audit-logs.js` | 272 | Page Controller |
| `admin/audit-logs/index.html` | 285 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/components/page-header/page-header.css`, `/admin/components/metrics/metrics.css`, `/admin/audit-logs/audit-logs.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/audit-logs/audit-logs.js` |
| `admin/dashboard/dashboard.css` | 1859 | Role-isolated stylesheet |
| `admin/dashboard/dashboard.js` | 189 | Page Controller |
| `admin/dashboard/index.html` | 224 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/dashboard/dashboard.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/dashboard/dashboard.js` |
| `admin/faculty-management/faculty.css` | 2153 | Role-isolated stylesheet |
| `admin/faculty-management/faculty.js` | 2829 | Exports: `window.switchFacultyTab`, `window.handleFacultySearch`, `window.handleFacultyFilterChange`, `window.switchFacultyMainTab`, `window.openApprovalsTab`, `window.setFacultyRoleFilter` |
| `admin/faculty-management/index.html` | 590 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/components/page-header/page-header.css`, `/admin/faculty-management/faculty.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/components/delete-modal/delete-modal.js`, `/admin/faculty-management/faculty.js` |
| `admin/profile/index.html` | 496 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/profile/profile.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/profile/profile.js` |
| `admin/profile/profile.css` | 594 | Role-isolated stylesheet |
| `admin/profile/profile.js` | 673 | Exports: `window.togglePassVisibility`, `window.triggerPhotoUpload`, `window.handlePhotoSelected`, `window.syncHeaderIdentity`, `window.removeProfilePhoto`, `window.handleGoogleLinkingToggle` |
| `admin/reports/index.html` | 421 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/components/page-header/page-header.css`, `/admin/components/metrics/metrics.css`, `https://cdn.jsdelivr.net/npm/chart.js`, `/admin/reports/reports.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/reports/reports.js` |
| `admin/reports/reports.css` | 969 | Role-isolated stylesheet |
| `admin/reports/reports.js` | 744 | Exports: `window.switchReportChart`, `window.switchReportTab`, `window.toggleFilterDrawer`, `window.updateFilterBadge`, `window.exportReport`, `window.exportCsv` |
| `admin/settings/index.html` | 220 | Loads: `/admin/components/core/reset.css`, `/admin/components/core/variables.css`, `/admin/components/admin-base.css`, `/admin/components/sidebar/sidebar.css`, `/admin/components/header/header.css`, `/admin/components/page-header/page-header.css`, `/admin/settings/settings.css`, `/admin/components/core/api.js`, `/admin/components/core/auth.js`, `/admin/components/icons.js`, `/admin/components/sidebar/sidebar.js`, `/admin/components/header/header.js`, `/admin/components/admin-ui.js`, `/admin/settings/settings.js` |
| `admin/settings/settings.css` | 509 | Role-isolated stylesheet |
| `admin/settings/settings.js` | 311 | Exports: `window.handleLogoFileSelect`, `window.handleBannerFileSelect`, `window.resetDefaultLogo`, `window.resetDefaultBanner`, `window.resetToOfficialDefaults`, `window.loadSettings` |

### Domain Section: `/faculty/components`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `faculty/components/README.md` | 72 | Component / Architecture Documentation |
| `faculty/components/faculty-base.css` | 624 | Role-isolated stylesheet |
| `faculty/components/faculty-ui.js` | 211 | Exports: `window.getFacultyIcon`, `window.escapeHtml`, `window.esc`, `window.showToast`, `window.facultyToast`, `window.openModal` |
| `faculty/components/icons.js` | 487 | Exports: `window.FacultyIcons`, `window.FACULTY_ICONS`, `window.getFacultyIcon`, `window.renderFacultyIcons` |
| `faculty/components/confirm-dialog/confirm-dialog.css` | 197 | Role-isolated stylesheet |
| `faculty/components/confirm-dialog/confirm-dialog.js` | 311 | Page Controller |
| `faculty/components/core/api.js` | 220 | Exports: `window.getDeviceId`, `window.showToast`, `window.handleSessionRevocation`, `window.FacultyAPI`, `window.fetchApi`, `window.apiFetch` |
| `faculty/components/core/auth.js` | 334 | Exports: `window.addEventListener`, `window.FacultyAuth`, `window.escHtml`, `window.esc`, `window.escapeHtml`, `window.getAuthToken` |
| `faculty/components/core/exceljs.min.js` | 1 | Component / Architecture Documentation |
| `faculty/components/core/reset.css` | 57 | Role-isolated stylesheet |
| `faculty/components/core/variables.css` | 239 | Role-isolated stylesheet |
| `faculty/components/delete-modal/delete-modal.css` | 357 | Role-isolated stylesheet |
| `faculty/components/delete-modal/delete-modal.html` | 82 | HTML Template Fragment |
| `faculty/components/delete-modal/delete-modal.js` | 384 | Exports: `window.showToast` |
| `faculty/components/dept-hero/dept-hero.css` | 200 | Role-isolated stylesheet |
| `faculty/components/dept-hero/dept-hero.html` | 39 | HTML Template Fragment |
| `faculty/components/dept-hero/dept-hero.js` | 211 | Page Controller |
| `faculty/components/header/header.css` | 595 | Role-isolated stylesheet |
| `faculty/components/header/header.html` | 123 | HTML Template Fragment |
| `faculty/components/header/header.js` | 574 | Exports: `window.getFacultyIcon`, `window.getCurrentUser`, `window.toggleAppTheme`, `window.toggleDashboardTheme`, `window.toggleUserProfile`, `window.toggleAdminProfileMenu` |
| `faculty/components/sidebar/sidebar.css` | 1729 | Role-isolated stylesheet |
| `faculty/components/sidebar/sidebar.html` | 91 | HTML Template Fragment |
| `faculty/components/sidebar/sidebar.js` | 700 | Exports: `window.getFacultyIcon`, `window.getCurrentUser`, `window.toggleFacultyTheme`, `window.toggleAppTheme`, `window.showToast`, `window.logout` |
| `faculty/components/dossier/dossier.css` | 1648 | Role-isolated stylesheet |
| `faculty/components/dossier/dossier.js` | 876 | Exports: `window.showToast`, `window.fetchApi`, `window.guardRoute`, `window.setCategoryFilter`, `window.onSearchDocuments`, `window.openUploadModal` |

### Domain Section: `/faculty`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `faculty/esp32-devices.html` | 311 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/esp32-devices/esp32-devices.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/esp32-devices/esp32-devices.js` |
| `faculty/index.html` | 35 | HTML Template Fragment |
| `faculty/esp32-devices/esp32-devices.css` | 469 | Role-isolated stylesheet |
| `faculty/esp32-devices/esp32-devices.js` | 523 | Exports: `window.loadEsp32Overview`, `window.onSelectActiveDevice`, `window.renderStudentsBiometricTable`, `window.queueEnrollCommandForStudent`, `window.triggerTemplateSyncToDevice`, `window.simulateStudentBiometric` |
| `faculty/esp32-devices/index.html` | 311 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/esp32-devices/esp32-devices.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/esp32-devices/esp32-devices.js` |
| `faculty/assessment-process/assessment-process.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/assessment-process/assessment-process.js` | 17 | Page Controller |
| `faculty/assessment-process/index.html` | 383 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/assessment-process/assessment-process.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/assessment-process/assessment-process.js` |
| `faculty/classes/classes.css` | 586 | Role-isolated stylesheet |
| `faculty/classes/classes.js` | 382 | Exports: `window.handleSearchClasses`, `window.handleSemesterFilter`, `window.openCreateGroupModal`, `window.closeCreateGroupModal`, `window.openBroadcastNoticeModal`, `window.closeBroadcastNoticeModal` |
| `faculty/classes/index.html` | 218 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/components/dept-hero/dept-hero.css`, `/faculty/classes/classes.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/header/header.js`, `/faculty/components/dept-hero/dept-hero.js`, `/faculty/classes/classes.js` |
| `faculty/classwork/classwork-create.css` | 1484 | Role-isolated stylesheet |
| `faculty/classwork/classwork-create.js` | 1383 | Exports: `window.cwFormatText`, `window.cwResetQuestionSlots`, `window.cwClearText`, `window.cwClearInstructions`, `window.cwInsertInstructionTemplate`, `window.cwToggleCollapse` |
| `faculty/classwork/index.html` | 14 | HTML Template Fragment |
| `faculty/classwork/create/index.html` | 396 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/classwork/classwork-create.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/classwork/classwork-create.js` |
| `faculty/course-file/course-file.css` | 1091 | Role-isolated stylesheet |
| `faculty/course-file/course-file.js` | 1251 | Exports: `window.fetchApi`, `window.setCategoryFilter`, `window.onSearchDocuments`, `window.onSwitchClass`, `window.openDirectUploadModal`, `window.onModalFileSelected` |
| `faculty/course-file/index.html` | 605 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/course-file/course-file.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/course-file/course-file.js` |
| `faculty/dashboard/dashboard.css` | 4944 | Role-isolated stylesheet |
| `faculty/dashboard/dashboard.js` | 3142 | Exports: `window.escapeHtml`, `window.esc`, `window.toggleFabMenu`, `window.switchDashboardTab`, `window.loadHodDashboardData`, `window.startLiveDateTime` |
| `faculty/dashboard/index.html` | 2081 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/components/dept-hero/dept-hero.css`, `/faculty/dashboard/dashboard.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dept-hero/dept-hero.js`, `/faculty/dashboard/dashboard.js` |
| `faculty/direct-assessment/direct-assessment.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/direct-assessment/direct-assessment.js` | 13 | Page Controller |
| `faculty/direct-assessment/index.html` | 382 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/direct-assessment/direct-assessment.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/direct-assessment/direct-assessment.js` |
| `faculty/group-detail/group-detail.css` | 18 | Role-isolated stylesheet |
| `faculty/group-detail/group-detail.js` | 82 | Exports: `window.initGroupPage`, `window.loadStream`, `window.loadMembers`, `window.loadAssignments`, `window.loadClassRegister`, `window.loadClassSheets` |
| `faculty/group-detail/index.html` | 3035 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/group-detail/group-detail.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/core/exceljs.min.js`, `/faculty/group-detail/js/group-detail-core.js`, `/faculty/group-detail/js/group-detail-stream.js`, `/faculty/group-detail/js/group-detail-people.js`, `/faculty/group-detail/js/group-detail-classwork.js`, `/faculty/group-detail/js/group-detail-register.js`, `/faculty/group-detail/js/group-detail-sheets.js`, `/faculty/group-detail/group-detail.js` |
| `faculty/group-detail/css/classwork.css` | 6371 | Role-isolated stylesheet |
| `faculty/group-detail/css/core.css` | 977 | Role-isolated stylesheet |
| `faculty/group-detail/css/people.css` | 319 | Role-isolated stylesheet |
| `faculty/group-detail/css/register.css` | 1744 | Role-isolated stylesheet |
| `faculty/group-detail/css/sheets.css` | 229 | Role-isolated stylesheet |
| `faculty/group-detail/css/stream.css` | 1636 | Role-isolated stylesheet |
| `faculty/group-detail/js/group-detail-classwork.js` | 4719 | Exports: `window._pendingDelete`, `window.S_stagedStudentFile`, `window.S_stagedAssignmentId`, `window.loadAssignments`, `window.loadTests`, `window.updateClassworkNavDot` |
| `faculty/group-detail/js/group-detail-core.js` | 738 | Exports: `window.S`, `window.ById`, `window.esc`, `window.initials`, `window.relTime`, `window.formatClassroomDate` |
| `faculty/group-detail/js/group-detail-people.js` | 304 | Exports: `window._pendingDelete`, `window.loadMembers`, `window.renderPeople`, `window.addStudentByEnroll`, `window.requestRemoveStudent`, `window.removeStudent` |
| `faculty/group-detail/js/group-detail-register.js` | 1997 | Exports: `window.classRegState`, `window.loadClassRegister`, `window.renderClassRegisterHeader`, `window.renderClassRegisterMatrix`, `window.renderMobileCompactMatrix`, `window.toggleDigitalPen` |
| `faculty/group-detail/js/group-detail-sheets.js` | 618 | Exports: `window.classSheetsState`, `window.loadClassSheets`, `window.switchClassroomSheetType`, `window.onClassSheetSearch`, `window.renderClassEvaluationSheet`, `window.renderClassTestsSheet` |
| `faculty/group-detail/js/group-detail-stream.js` | 815 | Exports: `window.loadStream`, `window.renderStream`, `window.renderAttachmentPill`, `window.renderPostCard`, `window.handlePostCardClick`, `window.openAnnouncementDetail` |
| `faculty/hod-archive/hod-archive.css` | 363 | Role-isolated stylesheet |
| `faculty/hod-archive/hod-archive.js` | 273 | Exports: `window.fetchApi` |
| `faculty/hod-archive/index.html` | 225 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/components/confirm-dialog/confirm-dialog.css`, `/faculty/students/students.css`, `/faculty/hod-archive/hod-archive.css`, `/faculty/components/core/auth.js`, `/faculty/components/core/api.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/confirm-dialog/confirm-dialog.js`, `/faculty/hod-archive/hod-archive.js` |
| `faculty/indirect-assessment/index.html` | 382 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/indirect-assessment/indirect-assessment.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/indirect-assessment/indirect-assessment.js` |
| `faculty/indirect-assessment/indirect-assessment.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/indirect-assessment/indirect-assessment.js` | 13 | Page Controller |
| `faculty/lab-classes/index.html` | 313 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/lab-classes/lab-classes.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/lab-classes/lab-classes.js` |
| `faculty/lab-classes/lab-classes.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/lab-classes/lab-classes.js` | 17 | Page Controller |
| `faculty/leave-approvals/index.html` | 225 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/leave-approvals/leave-approvals.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/leave-approvals/leave-approvals.js` |
| `faculty/leave-approvals/leave-approvals.css` | 837 | Role-isolated stylesheet |
| `faculty/leave-approvals/leave-approvals.js` | 411 | Exports: `window.filterByStatus`, `window.handleSearch`, `window.decideLeave`, `window.openRejectModal`, `window.closeRejectModal`, `window.confirmReject` |
| `faculty/media/index.html` | 295 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/media/media.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/media/media.js` |
| `faculty/media/media.css` | 809 | Role-isolated stylesheet |
| `faculty/media/media.js` | 833 | Exports: `window.apiFetch`, `window.selectCategory`, `window.onSubjectFilterChange`, `window.debounceFilter`, `window.setViewMode`, `window.openUploadModal` |
| `faculty/profile/index.html` | 377 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/profile/profile.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/profile/profile.js` |
| `faculty/profile/profile.css` | 485 | Role-isolated stylesheet |
| `faculty/profile/profile.js` | 372 | Exports: `window.togglePassVisibility`, `window.handleGoogleLinkAction`, `window.openProfileGoogleCard`, `window.closeGoogleCard`, `window.showGoogleEmailInput`, `window.showGoogleAccountList` |
| `faculty/registers/index.html` | 1725 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/registers/registers.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/registers/registers.js` |
| `faculty/registers/registers.css` | 650 | Role-isolated stylesheet |
| `faculty/registers/registers.js` | 3796 | Exports: `window.onRollCallPeriodChange`, `window.examStudioState`, `window.currentEvalSheetState`, `window.openAttendanceExportModal`, `window.closeAttendanceExportModal`, `window.selectExportFormat` |
| `faculty/reports/index.html` | 141 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/reports/reports.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/reports/reports.js` |
| `faculty/reports/reports.css` | 426 | Role-isolated stylesheet |
| `faculty/reports/reports.js` | 177 | Exports: `window.switchTab`, `window.loadAnalytics`, `window.loadEsp32Scans` |
| `faculty/sheets/index.html` | 872 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/sheets/sheets.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/core/exceljs.min.js`, `/faculty/sheets/sheets.js` |
| `faculty/sheets/sheets.css` | 2682 | Role-isolated stylesheet |
| `faculty/sheets/sheets.js` | 5218 | Exports: `window.escapeHtml`, `window.esc`, `window.S`, `window.toggleUserProfile`, `window.toggleAndroidProfileDrawer`, `window.handleLogout` |
| `faculty/student-performance/index.html` | 391 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/student-performance/student-performance.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/student-performance/student-performance.js` |
| `faculty/student-performance/student-performance.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/student-performance/student-performance.js` | 19 | Page Controller |
| `faculty/students/index.html` | 904 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/components/confirm-dialog/confirm-dialog.css`, `/faculty/students/students.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/confirm-dialog/confirm-dialog.js`, `/faculty/students/students.js` |
| `faculty/students/students.css` | 1706 | Role-isolated stylesheet |
| `faculty/students/students.js` | 2538 | Exports: `window.apiFetch`, `window.closeModal`, `window.hideModal`, `window.filterStudentsByYear`, `window.applyStudentFilters` |
| `faculty/theory-classes/index.html` | 312 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/theory-classes/theory-classes.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/components/dossier/dossier.js`, `/faculty/theory-classes/theory-classes.js` |
| `faculty/theory-classes/theory-classes.css` | 2 | Imports `/faculty/components/dossier/dossier.css` |
| `faculty/theory-classes/theory-classes.js` | 17 | Page Controller |
| `faculty/timetable/index.html` | 90 | Loads: `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, `/faculty/timetable/timetable.css`, `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, `/faculty/timetable/timetable.js` |
| `faculty/timetable/timetable.css` | 319 | Role-isolated stylesheet |
| `faculty/timetable/timetable.js` | 137 | Exports: `window.onClassChange`, `window.addSlot`, `window.removeSlot` |

### Domain Section: `/student/components`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `student/components/README.md` | 53 | Component / Architecture Documentation |
| `student/components/icons.js` | 183 | Exports: `window.STUDENT_ICONS`, `window.getStudentIcon`, `window.getSvgIcon` |
| `student/components/student-base.css` | 529 | Role-isolated stylesheet |
| `student/components/student-ui.js` | 118 | Exports: `window.showToast`, `window.escapeHtml`, `window.formatDate`, `window.formatPercentage` |
| `student/components/delete-modal/delete-modal.css` | 357 | Role-isolated stylesheet |
| `student/components/delete-modal/delete-modal.html` | 82 | HTML Template Fragment |
| `student/components/delete-modal/delete-modal.js` | 384 | Exports: `window.showToast` |
| `student/components/header/header.css` | 336 | Role-isolated stylesheet |
| `student/components/header/header.js` | 367 | Exports: `window.getStudentIcon`, `window.toggleDrawerComponent`, `window.mountStudentHeader`, `window.toggleStudentDrawer`, `window.toggleStudentApps`, `window.toggleStudentProfile` |
| `student/components/sidebar/sidebar.css` | 412 | Role-isolated stylesheet |
| `student/components/sidebar/sidebar.js` | 237 | Exports: `window.getStudentIcon`, `window.toggleDrawerComponent`, `window.mountStudentSidebar`, `window.toggleDrawer` |
| `student/components/core/api.js` | 169 | Exports: `window.handleSessionRevocation`, `window.fetchApi`, `window.apiRequest`, `window.apiFetch`, `window.attemptTokenRefresh`, `window.clearApiCache` |
| `student/components/core/auth.js` | 332 | Exports: `window.addEventListener`, `window.StudentAuth`, `window.escHtml`, `window.esc`, `window.escapeHtml`, `window.getAuthToken` |
| `student/components/core/classroom-nav.css` | 1166 | Role-isolated stylesheet |
| `student/components/core/reset.css` | 53 | Role-isolated stylesheet |
| `student/components/core/utils.js` | 326 | Exports: `window.escapeHtml`, `window.esc`, `window.formatDate`, `window.exportTableToRealXlsx` |
| `student/components/core/variables.css` | 249 | Role-isolated stylesheet |
| `student/components/dossier/dossier.css` | 1669 | Role-isolated stylesheet |
| `student/components/dossier/dossier.js` | 295 | Exports: `window.fetchApi`, `window.guardRoute`, `window.onCourseSwitch`, `window.setCategoryFilter`, `window.onSearchDocuments`, `window.openPreviewModal` |

### Domain Section: `/student`

| Relative File Path | Lines | Imported Stylesheets / Scripts or Exports |
| :--- | ---: | :--- |
| `student/index.html` | 12 | HTML Template Fragment |
| `student/assessment-process/assessment-process.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/assessment-process/assessment-process.js` | 16 | Page Controller |
| `student/assessment-process/index.html` | 159 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/assessment-process/assessment-process.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/components/dossier/dossier.js`, `/student/assessment-process/assessment-process.js` |
| `student/assignments/assignments.css` | 468 | Role-isolated stylesheet |
| `student/assignments/assignments.js` | 717 | Page Controller |
| `student/assignments/index.html` | 112 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/assignments/assignments.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/assignments/assignments.js` |
| `student/attendance/attendance.css` | 344 | Role-isolated stylesheet |
| `student/attendance/attendance.js` | 398 | Page Controller |
| `student/attendance/index.html` | 180 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/attendance/attendance.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/attendance/attendance.js` |
| `student/dashboard/dashboard.css` | 1045 | Role-isolated stylesheet |
| `student/dashboard/dashboard.js` | 1189 | Exports: `window.openJoinModal`, `window.closeJoinModal`, `window.handleJoinSubmit`, `window.openStudentStream`, `window.loadEnrolledClasses`, `window.openCompleteProfileModal` |
| `student/dashboard/index.html` | 460 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/dashboard/dashboard.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/dashboard/dashboard.js` |
| `student/direct-assessment/direct-assessment.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/direct-assessment/direct-assessment.js` | 12 | Page Controller |
| `student/direct-assessment/index.html` | 151 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/direct-assessment/direct-assessment.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/components/dossier/dossier.js`, `/student/direct-assessment/direct-assessment.js` |
| `student/group-detail/index.html` | 645 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/core/classroom-nav.css`, `/student/group-detail/student-group.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/group-detail/student-group.js` |
| `student/group-detail/student-group.css` | 2010 | Role-isolated stylesheet |
| `student/group-detail/student-group.js` | 1659 | Exports: `window.switchStudentTab`, `window.toggleStudentDrawer`, `window.toggleAppsLauncher`, `window.toggleUserProfile`, `window.toggleTheme`, `window.expandStudentComposer` |
| `student/indirect-assessment/index.html` | 151 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/indirect-assessment/indirect-assessment.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/components/dossier/dossier.js`, `/student/indirect-assessment/indirect-assessment.js` |
| `student/indirect-assessment/indirect-assessment.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/indirect-assessment/indirect-assessment.js` | 12 | Page Controller |
| `student/lab-classes/index.html` | 230 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/lab-classes/lab-classes.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/lab-classes/lab-classes.js` |
| `student/lab-classes/lab-classes.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/lab-classes/lab-classes.js` | 607 | Exports: `window.fetchApi`, `window.guardRoute`, `window.openDocModal`, `window.closeDocModal`, `window.handleCourseChange`, `window.setCategoryFilter` |
| `student/leave/index.html` | 102 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/leave/leave.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/leave/leave.js` |
| `student/leave/leave.css` | 102 | Role-isolated stylesheet |
| `student/leave/leave.js` | 114 | Exports: `window.updateLeaveDuration`, `window.setLeaveReason`, `window.applyLeave` |
| `student/nba/index.html` | 242 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/nba/nba.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/nba/nba.js` |
| `student/nba/nba.css` | 601 | Role-isolated stylesheet |
| `student/nba/nba.js` | 754 | Exports: `window.fetchApi`, `window.guardRoute`, `window.openDocModal`, `window.closeDocModal`, `window.handleCourseChange`, `window.setCategoryFilter` |
| `student/profile/index.html` | 312 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/profile/profile.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/profile/profile.js` |
| `student/profile/profile.css` | 187 | Role-isolated stylesheet |
| `student/profile/profile.js` | 316 | Page Controller |
| `student/scores/index.html` | 96 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/scores/scores.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/scores/scores.js` |
| `student/scores/scores.css` | 133 | Role-isolated stylesheet |
| `student/scores/scores.js` | 144 | Exports: `window.filterScoresView` |
| `student/student-performance/index.html` | 167 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/student-performance/student-performance.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/components/dossier/dossier.js`, `/student/student-performance/student-performance.js` |
| `student/student-performance/student-performance.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/student-performance/student-performance.js` | 18 | Page Controller |
| `student/theory-classes/index.html` | 231 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/theory-classes/theory-classes.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/theory-classes/theory-classes.js` |
| `student/theory-classes/theory-classes.css` | 2 | Imports `/student/components/dossier/dossier.css` |
| `student/theory-classes/theory-classes.js` | 608 | Exports: `window.fetchApi`, `window.guardRoute`, `window.openDocModal`, `window.closeDocModal`, `window.handleCourseChange`, `window.setCategoryFilter` |
| `student/timetable/index.html` | 80 | Loads: `/student/components/core/reset.css`, `/student/components/core/variables.css`, `/student/components/student-base.css`, `/student/components/header/header.css`, `/student/components/sidebar/sidebar.css`, `/student/timetable/timetable.css`, `/student/components/core/api.js`, `/student/components/core/auth.js`, `/student/components/core/utils.js`, `/student/components/icons.js`, `/student/components/student-ui.js`, `/student/components/header/header.js`, `/student/components/sidebar/sidebar.js`, `/student/timetable/timetable.js` |
| `student/timetable/timetable.css` | 201 | Role-isolated stylesheet |
| `student/timetable/timetable.js` | 156 | Exports: `window.filterTimetableDay` |
