# VidyaOS Faculty Components Architecture & Tracking Map

> **PURPOSE**: This directory tracks all modular, self-contained UI components exclusively built for the Faculty Portal (`/faculty/*`).
> It serves as the single source of truth for faculty UI/UX components, assets, and isolation rules to ensure zero external style/script contamination and zero duplicate SVG overhead.

---

## 🏛️ Isolation & Boundary Rules (Zero Outside Conflict)

1. **Strictly Self-Contained Components**:
   - All faculty UI primitives reside under `frontend/faculty/components/`.
   - Faculty pages **MUST NOT** load outside layout/component bundles (`/css/layout.css`, `/css/components.css`, `/css/classroom-nav.css`, `/css/nav.css`) or outside navigation scripts (`/js/ui.js`, `/js/nav.js`).
   - Outside scripts have runtime guards that immediately abort execution when mounted on any `/faculty/*` page.

2. **Permitted Shared Foundations (Read-Only)**:
   - `frontend/shared/css/reset.css`: Universal CSS reset.
   - `frontend/shared/css/variables.css`: Universal design tokens (CSS variables: `--bg-app`, `--bg-card`, `--text-main`, `--color-primary`, etc.). 0 hardcoded hex colors allowed.
   - `frontend/shared/js/api.js`: Standard institutional API client (`fetchApi`).
   - `frontend/shared/js/auth.js`: Session management and RBAC route guarding (`guardRoute()`, `getCurrentUser()`).
   - Essential 3rd party vendor libraries: `qrcode.min.js`, `exceljs.min.js`, `chart.js` where page-required.

---

## 📦 Component Inventory

### 1. `faculty-base.css`
- **Location**: `frontend/faculty/components/faculty-base.css`
- **Responsibility**: Provides universal typography, containers (`.faculty-app-layout`, `.faculty-main-wrap`, `.container`), buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`), forms (`.form-control`, `.form-select`, `.search-input-wrap`), tables (`.table`, `.data-table`), badges (`.badge`, `.tab-count-badge`), cards, modals (`.modal-backdrop`, `.modal-card`), and toast alerts.
- **Tokens**: 100% theme tokenized with CSS variables.

### 2. `faculty-ui.js`
- **Location**: `frontend/faculty/components/faculty-ui.js`
- **Responsibility**: In-folder UI utilities:
  - `showToast(msg, type, duration)` (and alias `facultyToast`)
  - `openModal(modalId)` / `closeModal(modalId)`
  - `confirmAction(options)` dynamic confirmation dialog generator
  - Accessible modal dismissal (Backdrop clicks & Escape key listeners)

### 3. Dedicated SVG Icon Registry (`icons.js`)
- **Location**: `frontend/faculty/components/icons.js` (aliased at `icons/icons.js`)
- **Responsibility**: Houses crisp, inline SVG vector builders for all icons used across Faculty & HOD pages.
- **API**:
  - `window.FACULTY_ICONS`: Dictionary of vector builder functions.
  - `window.getFacultyIcon(name, options)`: Returns scalable SVG string.
  - `window.renderFacultyIcons(root)`: Auto-hydrates any elements matching `[data-faculty-icon="name"]` or `[data-icon="name"]`.

### 4. Universal Academic Header (`header/`)
- **Location**: `frontend/faculty/components/header/`
  - `header.html`: Semantic top navbar template.
  - `header.css`: Theme-tokenized 52px sticky top bar, apps launcher popover, profile popover.
  - `header.js`: Identity synchronization (`getCurrentUser()`), apps launcher grid, theme switcher, avatar initials.

### 5. Academic Navigation Drawer (`sidebar/`)
- **Location**: `frontend/faculty/components/sidebar/`
  - `sidebar.html`: Drawer template with navigation links and sign out.
  - `sidebar.css`: Smooth slide-out drawer with dimmed backdrop overlay (`#faculty-sidebar-backdrop`).
  - `sidebar.js`: Sidebar toggle controller (`toggleSidebar()`), active route detection, HOD conditional links, keyboard shortcuts (`Ctrl+B`, `Esc`).

---

## 🛡️ Checklist for Faculty Pages
1. Link `/css/reset.css`, `/css/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, and the page stylesheet.
2. Never import `/css/layout.css`, `/css/components.css`, `/css/classroom-nav.css`, or `/css/nav.css`.
3. Load `/js/api.js`, `/js/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, and the page script.
4. Replace duplicated inline SVGs with `getFacultyIcon(name)` or `<span data-faculty-icon="name"></span>`.
5. Run `node backend/scripts/test-theme-support.js` and `verify-faculty-isolation.js`.

