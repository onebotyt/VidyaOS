# VidyaOS Student Components Architecture & Tracking Map

> **PURPOSE**: This directory tracks all modular, self-contained UI components exclusively built for the Student Portal (`/student/*`).
> It serves as the single source of truth for student UI/UX components, assets, and isolation rules so that code duplication is removed and student views stay lightweight, fast, and completely isolated from admin and faculty portals.

---

## 🏛️ Isolation & Boundary Rules (Zero Outside Conflict)

1. **Strictly Self-Contained Components**:
   - All student UI components reside under `student/components/`.
   - Student pages **MUST NOT** load administrative or faculty scripts (`/admin/components/*`, `/faculty/components/*`).
   - Student components are strictly read-oriented for attendance ledgers, marks, classwork, timetable, and leave requests.

2. **Permitted Shared Foundations (Read-Only)**:
   - `shared/css/reset.css`: Universal CSS reset.
   - `shared/css/variables.css`: Universal design tokens (CSS variables: `--bg-app`, `--bg-card`, `--text-main`, `--color-primary`, etc.). Zero hardcoded hex colors allowed.
   - `shared/js/api.js`: Standard institutional API client (`fetchApi`).
   - `shared/js/auth.js`: Session management and RBAC route guarding (`guardRoute(['STUDENT'])`, `getCurrentUser()`).

---

## 📦 Component Inventory

### 1. Dedicated Student SVG Icon Registry (`icons.js` / `icons/`)
- **Location**: `student/components/icons.js`
- **Responsibility**: Houses inline SVG vector definitions for student navigation (Dashboard, Attendance, Timetable, Assignments, Leave, Profile, Scores).

### 2. Universal Student Header (`header/`)
- **Location**: `student/components/header/`
- **Responsibility**: Responsive mobile-friendly student header with notification bell, student profile avatar, and semester/branch indicator.

### 3. Student Navigation Sidebar (`sidebar/`)
- **Location**: `student/components/sidebar/`
- **Responsibility**: Student navigation drawer and desktop sidebar with active route tracking.

### 4. Delete & Action Confirmation Modal (`delete-modal/`)
- **Location**: `student/components/delete-modal/`
- **Responsibility**: Accessible dialog for confirming student cancellations or leave withdrawals.

---

## 🗺️ Portal Rollout Tracking

| Page Route | Scope | Components Status |
| :--- | :--- | :--- |
| `/student/dashboard/` | Core Student Hub | Header, Sidebar, Summary Cards |
| `/student/attendance/` | Monthly Ledger & Percentages | Header, Sidebar, Attendance Matrix |
| `/student/assignments/` | Homework & Submissions | Header, Sidebar, Submissions Modal |
| `/student/timetable/` | Weekly Routine Schedule | Header, Sidebar, Routine Grid |
| `/student/scores/` | Class Test & Exam Marksheets | Header, Sidebar, Marks Table |
| `/student/leave/` | Leave Applications | Header, Sidebar, Form Modal |
| `/student/profile/` | Student KYC & Profile | Header, Sidebar, Profile Card |
