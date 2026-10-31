# 🧩 VidyaOS Component Developer & Collaboration Guide

> **Welcome Component Developers!**  
> This guide outlines how component developers collaborate on **VidyaOS**, maintain strict isolation between **Admin**, **Faculty**, and **Student** components, and utilize GitHub guards to keep the codebase clean, modular, and lightweight.

---

## 🎯 1. Architectural Goal: Making the System "Lite"

In legacy monolithic pages, every HTML file contains 200–400 lines of duplicate navigation menus, headers, SVGs, modals, and responsive drawers. This causes code bloat, high payload, and maintenance headaches.

By moving UI modules into self-contained **Components**:
- **90% Less Duplicate Code**: Pages only declare mount containers (e.g. `<div id="header-container"></div>` and `<div id="sidebar-container"></div>`).
- **Shared Caching**: The browser downloads and caches the component stylesheet and script once.
- **Single Source of Truth**: Updating a menu item, theme toggle, or notification bell is done in one component file, updating all pages automatically.

---

## 🏛️ 2. Three-Role Component Directory Structure & Isolation

To prevent permission leaks, styling collisions, or security breaches, the system has **3 strictly isolated component domains**, plus **1 shared UI primitive domain**:

```
VidyaOS/
├── admin/
│   └── components/          # 🔴 Developer 1 (Admin Domain)
│       ├── header/          # Admin top bar with system status & profile
│       ├── sidebar/         # Dual-state admin rail (Desktop 250px/72px, Mobile drawer)
│       ├── delete-modal/    # Admin entity deletion confirmation modal
│       ├── icons/           # Pure inline SVG vectors for admin routes
│       ├── admin-base.css   # Theme-tokenized admin base styling
│       └── admin-ui.js      # Admin toast alerts and modal triggers
│
├── faculty/
│   └── components/          # 🔵 Developer 2 (Faculty Domain)
│       ├── header/          # Faculty top bar with class shortcuts & profile
│       ├── sidebar/         # Faculty navigation drawer with active class indicators
│       ├── confirm-dialog/  # Action confirmation dialog
│       ├── delete-modal/    # Deletion safety modal
│       ├── dept-hero/       # HOD department leadership hero banner
│       ├── icons/           # Faculty inline SVG icons
│       ├── faculty-base.css # Theme-tokenized faculty styling
│       └── faculty-ui.js    # Faculty toast and modal engine
│
├── student/
│   └── components/          # 🟢 Developer 2 (Student Domain)
│       ├── header/          # Student header with branch/semester badge & bell
│       ├── sidebar/         # Student navigation drawer (attendance, scores, timetable)
│       ├── delete-modal/    # Student action confirmation modal
│       └── icons/           # Student SVG icons
│
└── components/              # ⚪ Shared UI Primitives (Both Developers)
    ├── ajax.js              # Resilient fetch utility
    ├── dialog.js            # Universal dialog
    ├── stat-card.js         # KPI metric card builder
    ├── table.js             # Data table pagination & sorting helper
    └── toast.js             # Notification toasts
```

### 🔒 Strict Isolation Rules:
1. **Never Import Cross-Role Components**:
   - `student/` pages must NEVER load `admin/components/` or `faculty/components/`.
   - `faculty/` pages must NEVER load `admin/components/`.
2. **Never Touch Core / Backend Files**:
   - Component developers are **strictly barred** from editing files in `backend/`, `server.js`, database files (`*.sqlite`), or auth middlewares.
3. **Never Touch Frozen Modules**:
   - The 9 frozen core faculty registers and evaluation folders are read-only.
4. **Zero Hardcoded Colors**:
   - Always use CSS variables from `shared/css/variables.css` (e.g., `var(--bg-app)`, `var(--text-main)`, `var(--border-color)`). Never hardcode hex codes like `#1e293b`.

---

## 👥 3. Team Member Delegation & Scopes

| Team Member | Primary Scope | Permitted Directories |
| :--- | :--- | :--- |
| **Lead Architect (`@onebotyt`)** | Core System, Backend, DB & Architecture | Full Repository Access |
| **Developer 1 (`@dev1_username`)** | Admin Components | `admin/components/**`, `components/**`, `*.md` |
| **Developer 2 (`@dev2_username`)** | Faculty & Student Components | `faculty/components/**`, `student/components/**`, `components/**`, `*.md` |

---

## 🛡️ 4. GitHub Enforcement & PR Guard

When any developer pushes code or opens a Pull Request, GitHub Actions automatically executes the **Component Isolation PR Guard** (`.github/workflows/components-pr-guard.yml`).

### How It Works:
1. It inspects all changed files between the PR branch and `main`.
2. It verifies that **100% of the modified files** reside inside `components/` (or `*.md` documentation).
3. If any file outside `components/` was modified:
   - ❌ **CI Fails Immediately**
   - GitHub blocks the PR from merging.
   - The log displays the exact files that must be reverted.

---

## ⚙️ 5. GitHub Repository Setup Checklist (For Repository Owner)

To complete the setup in your GitHub repository:

### Step 1: Add Developers as Collaborators
1. Go to `https://github.com/onebotyt/VidyaOS` > **Settings** > **Collaborators**.
2. Click **Add people** and invite Developer 1 and Developer 2 with **Write** (or Triage) access.

### Step 2: Configure Branch Protection on `main`
1. Go to **Settings** > **Branches** > click **Add branch ruleset** (or **Add rule**).
2. Branch name pattern: `main`.
3. Check the following protections:
   - ✅ **Require a pull request before merging**
     - Require 1 approval.
   - ✅ **Require status checks to pass before merging**
     - Search and select: `Verify PR Modifies Components Only`.
   - ✅ **Do not allow bypass**.
4. Click **Save Changes**.

### Step 3: Update GitHub Usernames in `.github/CODEOWNERS`
Edit `.github/CODEOWNERS` and replace `@dev1_username` and `@dev2_username` with their exact GitHub handles.
