<div align="center">
  <h1>🎓 VidyaOS — Frontend Portal</h1>
  <p><strong>Unified Institutional Campus Operating System — Client</strong></p>
  <p>
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3" />
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel" />
    <img src="https://img.shields.io/badge/Zero_Dependencies-✓-22c55e?style=flat-square" />
  </p>
</div>

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Start — Local Dev](#-quick-start--local-dev)
3. [Connecting to Remote Backend](#-connecting-to-remote-backend)
4. [Vercel Deployment](#-vercel-deployment-instant-gitops)
5. [Frontend Architecture](#-frontend-architecture)
6. [CSS Design System](#-css-design-system--theme-rules)
7. [API Integration Rules](#-api-integration-rules)
8. [Page Structure](#-page-structure)
9. [Demo Accounts](#-demo-accounts)
10. [Adding New Pages](#-adding-new-pages)

---

## Overview

This repository contains the **entire VidyaOS frontend client** — all HTML, CSS, and JavaScript. It is fully decoupled from the backend and can be:

- **Developed locally** via a built-in zero-dependency proxy dev server
- **Deployed globally** on Vercel with edge-level API proxying
- **Served directly** by the backend when co-located (e.g. Docker VPS)

**No build steps, no bundlers, no transpilation required.** Just vanilla HTML/CSS/JS.

---

## ⚡ Quick Start — Local Dev

### Requirements
- [Node.js](https://nodejs.org/) v18 or higher
- The **VidyaOS backend** running locally on port `3000` (or use a remote backend URL)

### 1. Clone & Run

```bash
git clone https://github.com/onebotyt/VidyaOS.git
cd VidyaOS

# Start the dev server + API proxy
npm run dev
```

Open your browser: **[http://localhost:5000](http://localhost:5000)**

### What the Dev Server Does

- ✅ Serves all HTML, CSS, and JS files instantly (anti-cache headers for instant edits)
- ✅ Proxies `/api/v1/*` and `/uploads/*` to the backend URL (default: `http://localhost:3000`)
- ✅ Zero CORS errors in browser
- ✅ No external npm packages required to run the proxy server

---

## 🔗 Connecting to Remote Backend

To work on the frontend while the backend is hosted on Render.com or a college server:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
BACKEND_URL=https://vidyaos-backend.onrender.com
```

Restart:
```bash
npm run dev
```

Now all API calls are proxied to the live remote backend. No CORS issues, no backend setup needed on your PC.

---

## 🌐 Vercel Deployment (Instant GitOps)

Every `git push` to `main` deploys automatically.

### Setup (one-time)

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub → Select `VidyaOS`
2. Vercel auto-detects the `vercel.json` configuration
3. Set the environment variable in Vercel dashboard:
   - `BACKEND_URL` → `https://vidyaos-backend.onrender.com`

That's it. The `vercel.json` edge rewrites automatically proxy:
- `/api/v1/**` → backend API
- `/uploads/**` → backend file storage

### Workflow

```bash
git add .
git commit -m "feat: update student attendance dashboard layout"
git push origin main
# ✓ Vercel deploys automatically in ~15 seconds
```

---

## 🏗️ Frontend Architecture

### Directory Structure

```
/
├── index.html                   ← Landing page (VidyaOS login gateway)
├── package.json                 ← npm scripts (npm run dev)
├── dev-server.js               ← Zero-dependency dev server + API reverse proxy
├── vercel.json                 ← Vercel edge rewrites for API proxying
├── .env.example                ← Environment variable template
│
├── admin/                      ← System Admin pages
│   ├── academic-structure.html ← Departments & academic year management
│   ├── faculty.html            ← Faculty management & WhatsApp gateway card
│   ├── audit-logs.html         ← System audit trail
│   └── whatsapp-gateway.html   ← Dedicated WhatsApp Web Bot console
│
├── faculty/                    ← Faculty & HOD pages
│   ├── registers.html          ← Attendance Matrix + Assignments + Tests (unified)
│   ├── hod-teachers.html       ← HOD faculty management
│   ├── hod-subjects.html       ← HOD curriculum & IRDT syllabus
│   ├── students.html           ← Student roster & self-registration approval queue
│   ├── reports.html            ← Analytics & defaulter reports
│   ├── assignments.html        ← Coursework management (standalone)
│   ├── tests.html              ← Class tests & marksheets (standalone)
│   ├── evaluation.html         ← Excel-style internal evaluation spreadsheet
│   └── groups.html             ← Teaching group stream discussion boards
│
├── student/                    ← Student self-service portal
│   ├── attendance.html         ← Day-wise attendance record & predictor
│   └── groups.html             ← Teaching group stream membership
│
├── login/                      ← Authentication flows
│   ├── faculty.html            ← Faculty login
│   ├── student.html            ← Student login
│   └── student-register.html  ← Student self-registration (OTP + Google OAuth)
│
└── shared/                     ← Single source of truth for shared assets
    ├── css/
    │   ├── variables.css       ← ALL CSS design tokens (colors, spacing, typography)
    │   ├── layout.css          ← Global layout (sidebar, header, page grid)
    │   └── components.css      ← Reusable UI components (cards, tables, modals)
    └── js/
        ├── auth.js             ← JWT authentication, navigation drawer, route guards
        ├── api.js              ← Centralized fetch wrapper with auto-token refresh
        ├── ui.js               ← Toast notifications, modals, loading indicators
        └── utils.js            ← Date helpers, formatting, common utilities
```

---

## 🎨 CSS Design System & Theme Rules

### ⚠️ Critical Rule: Zero Hardcoded Colors

**NEVER** write raw hex colors (`#fff`, `#1a2b3c`) or `rgb()` values in any CSS or inline styles. **Always** use CSS variables defined in `shared/css/variables.css`.

```css
/* ❌ WRONG */
background-color: #1e293b;
color: #94a3b8;
border: 1px solid #e2e8f0;

/* ✅ CORRECT */
background-color: var(--bg-card);
color: var(--text-muted);
border: 1px solid var(--border-color);
```

This ensures dark mode, light mode, and any future theme works automatically across all pages.

### Core Design Tokens

| Token | Usage |
| :--- | :--- |
| `--bg-app` | Page background |
| `--bg-surface` | Section/content areas |
| `--bg-card` | Card, input, and table cell backgrounds |
| `--text-main` | Primary text |
| `--text-muted` | Secondary/helper text |
| `--border-color` | Borders and dividers |
| `--color-primary` | Accent color, buttons, links |
| `--status-present` / `--status-absent` / `--status-late` | Attendance status colors |
| `--table-bg`, `--table-th-bg`, `--table-border` | Data table tokens |
| `--chip-admin-bg`, `--chip-faculty-bg`, `--chip-student-bg` | Role badge chips |

### Including Shared CSS in a New Page

```html
<link rel="stylesheet" href="/shared/css/variables.css">
<link rel="stylesheet" href="/shared/css/layout.css">
<link rel="stylesheet" href="/shared/css/components.css">
```

---

## 🔌 API Integration Rules

### Rule 1: Always Use Relative URLs

```javascript
// ❌ WRONG — breaks on Vercel, Docker, and team PCs
fetch('http://localhost:3000/api/v1/auth/login', ...)

// ✅ CORRECT — works everywhere via proxy
fetch('/api/v1/auth/login', ...)
```

### Rule 2: Use the Shared API Client

Always use `fetchApi()` from `shared/js/api.js` — it handles token injection, auto-refresh, and error toasts automatically:

```javascript
// Include in your page:
<script src="/shared/js/api.js"></script>

// Then use:
const data = await fetchApi('/faculty/registers');
const result = await fetchApi('/attendance/sessions', {
  method: 'POST',
  body: JSON.stringify({ register_id: 5 })
});
```

### Rule 3: Use Route Guards

Every protected page must call `guardRoute()` from `shared/js/auth.js`:

```javascript
<script src="/shared/js/auth.js"></script>
<script>
  // At the top of your page script:
  guardRoute({ requireAuth: true });                    // Any logged-in user
  guardRoute({ requireHOD: true });                     // HOD only
  guardRoute({ requireClassTeacher: true });            // Class teacher only
  guardRoute({ requireSubjects: true });                // Teacher with subjects
</script>
```

---

## 📄 Page Structure

Every HTML page follows this standard template:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — VidyaOS</title>

  <!-- Shared CSS (always in this order) -->
  <link rel="stylesheet" href="/shared/css/variables.css">
  <link rel="stylesheet" href="/shared/css/layout.css">
  <link rel="stylesheet" href="/shared/css/components.css">

  <style>
    /* Page-specific styles using ONLY CSS variables */
  </style>
</head>
<body>
  <!-- Navigation Sidebar (injected by auth.js) -->
  <div id="sidebar-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content">
    <div class="page-header">
      <h1>Page Title</h1>
    </div>

    <!-- Page-specific content here -->
  </main>

  <!-- Shared Scripts (always in this order) -->
  <script src="/shared/js/api.js"></script>
  <script src="/shared/js/ui.js"></script>
  <script src="/shared/js/auth.js"></script>
  <script src="/shared/js/utils.js"></script>

  <script>
    // Always guard first
    guardRoute({ requireAuth: true });

    // Then your page logic
    async function loadData() { ... }
    loadData();
  </script>
</body>
</html>
```

---

## 🔐 Demo Accounts

| Role | Email / Username | Password | Console URL |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `Admin@123` | `/admin/academic-structure.html` |
| **HOD — IT Dept** | `hod.it@college.edu` | `Password@123` | `/faculty/hod-teachers.html` |
| **HOD — CE Dept** | `hod.ce@college.edu` | `Password@123` | `/faculty/hod-teachers.html` |
| **Faculty / Class Teacher** | `prof.sharma@college.edu` | `Password@123` | `/faculty/registers.html` |
| **Faculty** | `prof.patel@college.edu` | `Password@123` | `/faculty/registers.html` |
| **Student** | `student.it01@college.edu` | `Password@123` | `/student/attendance.html` |

> 💡 These accounts exist in the **demo SQLite database** in the backend. Change all passwords before going live.

---

## ➕ Adding New Pages

1. **Create the HTML file** in the appropriate directory (`admin/`, `faculty/`, or `student/`).
2. **Use the standard template** shown above.
3. **Include shared CSS and JS** in the correct order.
4. **Call `guardRoute()`** with the required role.
5. **Use `fetchApi()`** for all API calls — never raw `fetch()` with hardcoded URLs.
6. **Zero hardcoded colors** — use only `var(--token-name)` from `variables.css`.
7. **Add a link in the sidebar** by editing the nav items in `shared/js/auth.js`.

**Run the theme compliance check after your changes:**
```bash
# From the backend repo:
node backend/scripts/test-theme-support.js
# Must show: 93 Passed, 0 Failed
```

---

## 🧪 Frontend Verification

```bash
# Start backend server (from VidyaOS_BackEnd repo)
cd VidyaOS_BackEnd && node server.js

# Start frontend dev server (this repo)
npm run dev

# Visit http://localhost:5000 and login with demo accounts
```

---

<div align="center">
  <p>© 2026 VidyaOS — Institutional Campus Operating System</p>
  <p><em>Frontend Portal · Decoupled · Zero Build Step · Instant Vercel Deploy</em></p>
</div>
