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

## 📦 Component Inventory & Reusability Guide

### 1. Institutional Hero Showcase (`hero/`)
- **Directory**: `frontend/admin/components/hero/` (`hero.css`, `hero.js`)
- **Visual Design**:
  - Rounded 16px elevated banner with subtle border and institutional campus photo overlay.
  - "ADMIN PORTAL" pill badge with blue gradient glow.
  - Personalized welcome headline: `"Welcome back, [Admin Name]"`.
  - Subtitle with administrative overview.
  - Live real-time ticking date chip (`Sat, 31 Oct 2026`) and ticking time chip (`10:37 PM`).
- **Reusable on Other Pages**:
  - `academic-structure.html`: Reusable with badge `"ACADEMIC STRUCTURE"` and custom title/subtitle.
  - `faculty.html`: Reusable with badge `"HOD LEADERSHIP"`.
  - `reports.html`: Reusable with badge `"CAMPUS ANALYTICS"`.
  - `audit-logs.html`: Reusable with badge `"SECURITY & AUDIT"`.
- **API**:
  ```javascript
  AdminHero.mount('#hero-container', {
    badge: 'ACADEMIC STRUCTURE',
    titlePrefix: 'Manage Campus Structure,',
    subtitle: 'Configure departments, degree programs, semesters, and sections.'
  });
  ```

---

### 2. KPI Metrics Grid (`metrics/`)
- **Directory**: `frontend/admin/components/metrics/` (`metrics.css`, `metrics.js`)
- **Visual Design**:
  - Exact 2x2 grid on mobile screens (`repeat(2, 1fr)`) and 4 columns on desktop (`repeat(4, 1fr)`).
  - Tactile squircle icons with soft colored backgrounds:
    - **Total Students**: `icon-blue` (Users icon)
    - **Total Faculty**: `icon-green` (Graduation cap icon)
    - **Departments**: `icon-purple` (Building icon)
    - **Active Classes**: `icon-amber` (Layered stack icon)
  - Numeric counter with large bold font.
  - Trend pill indicator (`↑ 0% vs last month`).
- **Reusable on Other Pages**:
  - `academic-structure.html`: Summarizing departments count, programs, sections, and active cohorts.
  - `faculty.html`: Summarizing total HODs appointed, active faculty, department coverage, and pending credentials.
- **API**:
  ```javascript
  AdminMetrics.mount('#metrics-container', statsData);
  AdminMetrics.update(statsData);
  ```

---

### 3. Today's Attendance Overview Gauge (`attendance-overview/`)
- **Directory**: `frontend/admin/components/attendance-overview/` (`attendance-overview.css`, `attendance-overview.js`)
- **Visual Design**:
  - Circular SVG donut progress gauge displaying overall presence rate (`0% Present`).
  - Animated dash-offset track.
  - Department filter pill dropdown (`All Dept. ▾`).
  - 3 breakdown rows with squircle status icons:
    - Present count (`icon-present` with green check badge)
    - Absent count (`icon-absent` with red alert badge)
    - Total students count (`icon-total` with blue group badge)
- **Reusable on Other Pages**:
  - `reports.html`: Attendance telemetry card.
  - `faculty/dashboard.html`: Branch-level attendance gauge.
- **API**:
  ```javascript
  AdminAttendanceOverview.mount('#attendance-card', statsData);
  AdminAttendanceOverview.update(statsData, 'IT');
  ```

---

### 4. Department Breakdown Bar Chart (`dept-breakdown/`)
- **Directory**: `frontend/admin/components/dept-breakdown/` (`dept-breakdown.css`, `dept-breakdown.js`)
- **Visual Design**:
  - Header with purple bar chart icon, title, and right-aligned campus average pill badge (`Avg: 0%`).
  - Flex container of vertical column bars (`IT`, `ECE`, `EE`, `ME`, `CE`, `PHARM`).
  - Each column displays:
    - Percentage label on top (`0%`)
    - Vertical track with filled pill bar corresponding to percentage
    - Department code on bottom
- **Reusable on Other Pages**:
  - `reports.html`: Inter-departmental comparison charts.
  - `academic-structure.html`: Department density overview.
- **API**:
  ```javascript
  AdminDeptBreakdown.mount('#dept-chart', deptsArray, campusAvgPct);
  AdminDeptBreakdown.update(deptsArray, campusAvgPct);
  ```

---

### 5. Quick Access Navigation Portals (`quick-actions/`)
- **Directory**: `frontend/admin/components/quick-actions/` (`quick-actions.css`, `quick-actions.js`)
- **Visual Design**:
  - Header with purple lightning bolt icon, "Quick Access" title, and count badge (`6 Portals`).
  - Responsive grid linking all 6 core admin management sections:
    1. **Academic Structure** (`/admin/academic-structure.html`) — Blue squircle stack
    2. **HOD Management** (`/admin/faculty.html`) — Purple squircle users
    3. **Reports & Analytics** (`/admin/reports.html`) — Green squircle bar chart
    4. **Audit Logs** (`/admin/audit-logs.html`) — Amber squircle file sheet
    5. **System Settings** (`/admin/settings.html`) — Slate squircle cog gear
    6. **Admin Profile** (`/admin/profile.html`) — Purple squircle user avatar
- **Reusable on Other Pages**:
  - Can be embedded at the footer of any admin view or settings hub as a universal quick switcher.
- **API**:
  ```javascript
  AdminQuickActions.mount('#quick-access-container');
  ```

---

### 6. Recent Activity Audit Trail (`recent-activity/`)
- **Directory**: `frontend/admin/components/recent-activity/` (`recent-activity.css`, `recent-activity.js`)
- **Status**: Extracted into a modular component for dedicated audit views. (Excluded from the main mobile dashboard per user request).
- **Reusable on Other Pages**:
  - `audit-logs.html`: Main real-time activity feed.
  - `faculty.html`: Recent faculty modifications log.
- **API**:
  ```javascript
  AdminRecentActivity.mount('#activity-container', activityItems);
  AdminRecentActivity.update(activityItems);
  ```

---

### 7. Unified Dual-State Admin Sidebar & Mobile Top Header (`sidebar/`)
- **Directory**: `frontend/admin/components/sidebar/` (`sidebar.css`, `sidebar.js`, `sidebar.html`)
- **Visual Design**:
  - **Sticky Mobile Top Header**: Clean light background (`var(--bg-card)`), hamburger trigger, 3D isometric cube logo, `"VidyaOS / Admin Portal"`, search button, notification bell with badge `"3"`, and avatar `"SA"` with online dot.
  - **Bottom Navigation Dock (5 Tabs)**: Home, Structure, HOD, Reports, Settings.
- **API**:
  - Automatically mounted via `/admin/components/sidebar/sidebar.js`.

---

## 🗺️ Portal Rollout Tracking

| Page Route | Status | Sidebar Component | Icons Module | Hero | Metrics | Overview | Dept Chart | Quick Actions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin/dashboard.html` | ✅ Fully Migrated | `sidebar/` | `icons.js` | ✅ `hero/` | ✅ `metrics/` | ✅ `attendance-overview/` | ✅ `dept-breakdown/` | ✅ `quick-actions/` |
| `/admin/academic-structure.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | 💡 Available | — | 💡 Available | 💡 Available |
| `/admin/faculty.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | 💡 Available | — | — | 💡 Available |
| `/admin/reports.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | 💡 Available | 💡 Available | 💡 Available | 💡 Available |
| `/admin/settings.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | — | — | — | 💡 Available |
| `/admin/audit-logs.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | — | — | — | 💡 Available (`recent-activity/`) |
| `/admin/profile.html` | ⏳ Ready to Mount | `sidebar/` | `icons.js` | 💡 Available | — | — | — | 💡 Available |

---

## 🛡️ Conflict Prevention Checklist for New Pages
1. Only link `/admin/components/sidebar/sidebar.css`, component stylesheets, and the page-specific stylesheet.
2. Never import `/css/layout.css` or `/css/components.css`.
3. Load `/admin/components/icons.js` and component controllers.
4. Run `node backend/scripts/test-theme-support.js` to ensure zero hardcoded hex colors.
