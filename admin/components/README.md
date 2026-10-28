# VidyaOS Admin Components Architecture & Tracking Map

> **PURPOSE**: This directory tracks all modular, self-contained components exclusively built for the Admin Portal (`/admin/*`).
> It serves as the single source of truth for admin UI/UX components, assets, and isolation rules so that clean-up and maintenance can proceed without UI regression.

---

## 🏛️ Isolation & Boundary Rules (Zero Outside Conflict)

1. **Self-Contained Components**:
   - All admin components reside under `frontend/admin/components/`.
   - Admin pages **MUST NOT** load outside navigation scripts (`/js/nav.js`, `/js/admin-nav.js`) or outside layout/component bundles (`/css/layout.css`, `/css/components.css`, `/css/classroom-nav.css`).
   - Outside scripts have runtime guards that immediately abort execution when mounted on any `/admin/*` page.

2. **Permitted Shared Foundations**:
   - `frontend/shared/css/reset.css`: Universal CSS reset.
   - `frontend/shared/css/variables.css`: Universal theme tokens (CSS variables: `--bg-app`, `--text-main`, `--color-primary`, etc.). 0 hardcoded hex colors allowed.
   - `frontend/shared/js/api.js`: Standard institutional API client (`fetchApi`).
   - `frontend/shared/js/auth.js`: Session management and RBAC route guarding (`guardRoute(['SYSTEM_ADMIN'])`, `getCurrentUser()`).

---

## 📦 Component Inventory

### 1. Unified Dual-State Admin Sidebar (`sidebar/`)
- **Directory**: `frontend/admin/components/sidebar/`
  - `sidebar.html`: Semantic HTML template.
  - `sidebar.css`: 100% theme-tokenized styles for desktop expanded, desktop collapsed rail, and mobile drawer.
  - `sidebar.js`: Controller with toggle handlers, `localStorage` rail state persistence, and `Ctrl+B` keyboard shortcut.
- **States**:
  - **Desktop Expanded (≥ 769px, 250px)**: VidyaOS Console header, pause `||` collapse button, active solid blue pill for current page, inactive menu items, profile & sign-out footer.
  - **Desktop Collapsed Rail (≥ 769px, 72px)**: 3D isometric cube logo SVG, centered squircle active icon, vertical icon rail, compact profile & logout footer.
  - **Mobile Drawer (≤ 768px, 280px)**: Top header with dark hamburger and notifications bell. Slide-out drawer with dimmed backdrop (`#sidebar-backdrop`).

### 2. Dedicated Admin SVG Icon Registry (`icons.js`)
- **File**: `frontend/admin/components/icons.js` (aliased at `icons/icons.js`)
- **Responsibility**: Houses pure, inline SVG vector definitions for all icons used across the Admin Portal.
- **API**:
  - `window.ADMIN_ICONS`: Dictionary of SVG builder functions.
  - `window.getAdminIcon(name, options)`: Returns string markup with custom width, height, stroke, and class.
  - `window.renderAdminIcons(root)`: Scans DOM for `[data-admin-icon]` and auto-hydrates them with SVGs.
- **Included Icons**:
  - `cube`, `menu`, `pause`, `chevronLeft`, `chevronRight`, `chevronDown`, `close`, `bell`
  - `dashboard`, `academicStructure`, `hodManagement`, `reports`, `settings`, `audit`
  - `user`, `logout`, `institution`, `arrowRight`, `shieldLock`, `userCheck`, `users`, `check`

---

## 🗺️ Portal Rollout Tracking

| Page Route | Status | Sidebar Component | Icons Module | Outside CSS/JS Blocked |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/dashboard.html` | ✅ Fully Migrated | `sidebar/` (Dual-State) | `icons.js` | ✅ Yes (Isolated) |
| `/admin/academic-structure.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |
| `/admin/faculty.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |
| `/admin/reports.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |
| `/admin/settings.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |
| `/admin/audit-logs.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |
| `/admin/profile.html` | ⏳ Pending Adoption | Legacy Drawer | Inline | Next Phase |

---

## 🛡️ Conflict Prevention Checklist for New Pages
1. Only link `/admin/components/sidebar/sidebar.css` and the page-specific stylesheet (e.g. `dashboard.css`).
2. Never import `/css/layout.css` or `/css/components.css`.
3. Load `/admin/components/icons.js` and `/admin/components/sidebar/sidebar.js`.
4. Run `node backend/scripts/test-theme-support.js` to ensure zero hardcoded hex colors.

