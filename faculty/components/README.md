# VidyaOS Faculty Components Architecture & Tracking Map

> **PURPOSE**: This directory tracks all modular, self-contained UI components exclusively built for the Faculty Portal (`/faculty/*`).
> It serves as the single source of truth for faculty UI/UX components, assets, and isolation rules to ensure zero external style/script contamination and zero duplicate SVG overhead.

---

## 🏛️ Isolation & Boundary Rules (Zero Outside Conflict)

1. **Strictly Self-Contained Components**:
   - All faculty UI primitives reside under `frontend/faculty/components/`.
   - Faculty pages **MUST NOT** load outside layout/component bundles (`/css/layout.css`, `/css/components.css`, `/css/classroom-nav.css`, `/css/nav.css`) or outside navigation scripts (`/js/ui.js`, `/js/nav.js`).
   - Outside scripts have runtime guards that immediately abort execution when mounted on any `/faculty/*` page.

2. **Autonomous Core Foundations (`core/`)**:
   - `faculty/components/core/reset.css`: Self-contained CSS reset.
   - `faculty/components/core/variables.css`: Self-contained design tokens (CSS variables: `--bg-app`, `--bg-card`, `--text-main`, `--color-primary`, etc.). 0 hardcoded hex colors allowed.
   - `faculty/components/core/api.js`: Self-contained institutional API client (`FacultyAPI`, `fetchApi`).
   - `faculty/components/core/auth.js`: Session management, XSS protection (`escHtml`), and RBAC route guarding (`requireFacultyAuth(['TEACHER', 'HOD'])`).
   - Essential 3rd party vendor libraries: `qrcode.min.js`, `exceljs.min.js`, `chart.js` where page-required.

---

## 📦 Component Inventory

### 1. `core/` (Autonomous Foundation)
- **Location**: `faculty/components/core/`
- **Responsibility**: Isolates Reset, Variables, API, and Auth so Faculty is 100% self-sufficient without depending on global `/shared/` or `/admin/` files.

### 2. `faculty-base.css`
- **Location**: `faculty/components/faculty-base.css`
- **Responsibility**: Provides universal typography, containers (`.faculty-app-layout`, `.faculty-main-wrap`, `.container`), buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`), forms (`.form-control`, `.form-select`, `.search-input-wrap`), tables (`.table`, `.data-table`), badges (`.badge`, `.tab-count-badge`), cards, modals (`.modal-backdrop`, `.modal-card`), and toast alerts.
- **Tokens**: 100% theme tokenized with CSS variables.

### 3. `faculty-ui.js`
- **Location**: `faculty/components/faculty-ui.js`
- **Responsibility**: In-folder UI utilities:
  - `showToast(msg, type, duration)` (and alias `facultyToast`)
  - `openModal(modalId)` / `closeModal(modalId)`
  - `confirmAction(options)` dynamic confirmation dialog generator
  - Accessible modal dismissal (Backdrop clicks & Escape key listeners)

### 4. Dedicated SVG Icon Registry (`icons.js`)
- **Location**: `faculty/components/icons.js`
- **Responsibility**: Houses crisp, inline SVG vector builders for 60+ icons used across Faculty & HOD pages.
- **API**:
  - `window.FacultyIcons.get(name, options)` / `window.getFacultyIcon(name, options)`: Returns scalable SVG string.
  - `window.FacultyIcons.create(name, options)`: Returns real SVG DOM node.
  - `window.FacultyIcons.render(root)`: Auto-hydrates elements matching `[data-faculty-icon="name"]`.
  - `window.FACULTY_ICONS`: Dictionary of vector builder functions.

### 5. Universal Academic Header (`header/`)
- **Location**: `faculty/components/header/`
  - `header.html`: Semantic top navbar template.
  - `header.css`: Theme-tokenized 52px sticky top bar, apps launcher popover, profile popover.
  - `header.js`: Identity synchronization (`getCurrentUser()`), apps launcher grid, theme switcher, avatar initials.

### 6. Academic Navigation Drawer (`sidebar/`)
- **Location**: `faculty/components/sidebar/`
  - `sidebar.html`: Drawer template with navigation links and sign out.
  - `sidebar.css`: Smooth slide-out drawer with dimmed backdrop overlay (`#faculty-sidebar-backdrop`).
  - `sidebar.js`: Sidebar toggle controller (`toggleSidebar()`), active route detection, HOD conditional links, keyboard shortcuts (`Ctrl+B`, `Esc`).

---

## 🛡️ Checklist for Faculty Pages
1. Link `/faculty/components/core/reset.css`, `/faculty/components/core/variables.css`, `/faculty/components/faculty-base.css`, `/faculty/components/header/header.css`, `/faculty/components/sidebar/sidebar.css`, and the page stylesheet.
2. Never import `/css/layout.css`, `/css/components.css`, `/css/classroom-nav.css`, or `/css/nav.css`.
3. Load `/faculty/components/core/api.js`, `/faculty/components/core/auth.js`, `/faculty/components/icons.js`, `/faculty/components/faculty-ui.js`, `/faculty/components/header/header.js`, `/faculty/components/sidebar/sidebar.js`, and the page script.
4. Replace duplicated inline SVGs with `getFacultyIcon(name)` or `<span data-faculty-icon="name"></span>`.
5. Run `node backend/scripts/test-theme-support.js` and `verify-faculty-isolation.js`.

