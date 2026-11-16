# VidyaOS — Database Seed Records & System Changelog

**Last Updated:** November 13, 2026  
**Environment:** Termux Linux / MariaDB 13.0.2 / Node.js  
**Frontend URL:** `http://localhost:5000`  
**Backend URL:** `http://localhost:3000`  

---

## 1. Executive Summary

This document serves as the authoritative log of all institutional seed data, database schema extensions, backend bug fixes, and frontend component modularization completed for VidyaOS.

The setup provides a realistic academic environment in **Information Technology (Year 3, Semester 5, Academic Year 2026-27)** comprising:
- **1 IT Department HOD** (`it_hod@gmail.com`)
- **1 Branch IT Subject Teacher** (`it_teacher@gmail.com`)
- **1 Common Faculty Manager** (`common_faculty@gmail.com`)
- **1 System Administrator** (`admin@gmail.com`)
- **5 Cohort Students** (`student1@gmail.com` through `student5@gmail.com`)
- **4 Classroom Teaching Groups & Stream Posts**
- **4 Assessments & Graded Submissions**
- **3 Attendance Registers, 8 Historical Finalized Sessions + 1 Live Open Session**
- **13 Timetable Period Slots (Mon–Fri)**
- **Medical & Event Leave Applications**
- **Component deduplication & strict role isolation across Admin, Faculty, and Student portals**

---

## 2. Institutional Entities & Seed Accounts

All accounts share the standard test password: `Admin@123`

| User ID | Email | Username | Full Name / Profile | System Roles | Specific Assignment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `admin@gmail.com` | `admin` | System Administrator | `SYSTEM_ADMIN` | Institute System Master |
| **4** | `it_hod@gmail.com` | `it_hod` | Dr. Vivek Sharma | `TEACHER`, `HOD` | HOD of IT Department (ID 1), Teacher ID 2 |
| **5** | `it_teacher@gmail.com` | `it_teacher` | Prof. Neha Gupta | `TEACHER` | Branch Faculty (DBMS & Web Tech), Teacher ID 3 |
| **6** | `common_faculty@gmail.com` | `common_faculty` | Dr. Amit Verma | `TEACHER`, `COMMON_FACULTY_MANAGER` | Common Faculty Manager (Ethics & Communication), Teacher ID 4 |
| **3** | `student1@gmail.com` | `student1` | Aarav Sharma | `STUDENT` | Roll 1, Enrollment `2024IT001`, Reg `UBTER2024001` |
| **7** | `student2@gmail.com` | `student2` | Priya Patel | `STUDENT` | Roll 2, Enrollment `2024IT002`, Reg `UBTER2024002` |
| **8** | `student3@gmail.com` | `student3` | Rohan Verma | `STUDENT` | Roll 3, Enrollment `2024IT003`, Reg `UBTER2024003` |
| **9** | `student4@gmail.com` | `student4` | Ananya Singh | `STUDENT` | Roll 4, Enrollment `2024IT004`, Reg `UBTER2024004` |
| **10** | `student5@gmail.com` | `student5` | Vikram Joshi | `STUDENT` | Roll 5, Enrollment `2024IT005`, Reg `UBTER2024005` |

---

## 3. Academic Structure

- **Academic Year:** `2026-27 (Odd Semester)` (ID 1, is_current: 1)
- **Department:** `Information Technology` (ID 1, code: `IT`, HOD: Dr. Vivek Sharma, `hod_user_id: 4`)
- **Cohort:** Year 3, Semester 5, Section A

### Subjects & Teaching Assignments

| Subject ID | Code | Subject Name | Type | Credits | Assigned Teacher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `IT-501` | Software Engineering | Theory | 3 | Dr. Vivek Sharma (HOD) |
| **2** | `IT-502` | Database Management Systems | Theory | 3 | Prof. Neha Gupta |
| **3** | `IT-503P` | Web Technologies Lab | Practical | 2 | Prof. Neha Gupta |
| **4** | `AS-504` | Professional Ethics & Communication | Theory | 2 | Dr. Amit Verma (Common Faculty) |

---

## 4. Classroom & Coursework Details

### Teaching Groups (Virtual Classrooms)
All 5 students are actively enrolled in all 4 teaching groups (`teaching_group_members`).

| Group ID | Name | Subject Code | Invite Code | Lead Instructor | Enrolled |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Software Engineering (Theory) | `IT-501` | `SE501A` | Dr. Vivek Sharma | 5 Students |
| **2** | Database Management Systems | `IT-502` | `DB502B` | Prof. Neha Gupta | 5 Students |
| **3** | Web Technologies Lab | `IT-503P` | `WEB503` | Prof. Neha Gupta | 5 Students |
| **4** | Professional Ethics & Communication | `AS-504` | `ETH504` | Dr. Amit Verma | 5 Students |

### Stream Posts & Announcements
- **Group 1:** Welcome announcement introducing the Software Engineering syllabus, textbook reference, and Agile methodology outline.
- **Group 2:** Reference slides on relational normalization (1NF through BCNF) and indexing strategies.
- **Group 3:** Lab setup guide for modern HTML5/CSS3 components and responsive layouts.
- **Group 4:** Welcome post on professional communication and workplace ethics.

### Assessments & Submissions
1. **SE System Requirements Specification (SRS) Document:**
   - Assessment ID 1, Total Marks: 100, Due: Nov 20, 2026.
   - Aarav Sharma (`student1`): Submitted, Graded `92/100` ("Exceptional functional specifications and UML diagrams").
   - Priya Patel (`student2`): Submitted, Graded `88/100` ("Solid requirements analysis and traceability matrix").
2. **DBMS ER-Diagram & Normalization Exercise:**
   - Assessment ID 2, Total Marks: 50, Due: Nov 18, 2026.
3. **Web Tech Responsive Portfolio Lab:**
   - Assessment ID 3, Total Marks: 50, Due: Nov 22, 2026.
4. **Mid-Term Examination:**
   - Assessment ID 4, Total Marks: 50.
   - All 5 students have recorded mid-term exam marks.

---

## 5. Attendance Registers & Live Sessions

### Registers (`attendance_registers`)
1. **ID 1:** `Software Engineering Register (IT Sem 5)` — Theory, Teacher: Dr. Vivek Sharma.
2. **ID 2:** `DBMS Theory Register (IT Sem 5)` — Theory, Teacher: Prof. Neha Gupta.
3. **ID 3:** `Web Technologies Lab Register (IT Sem 5)` — Practical, Teacher: Prof. Neha Gupta.

### Attendance Sessions (`attendance_sessions`)
- **8 Historical Sessions (IDs 1–8):** Finalized across October and November 2026.
  - Full roll-call marks synchronized across both `attendance_session_students` and `register_attendance`.
  - Student 1 (Aarav Sharma): 100% attendance (8/8 sessions attended).
- **1 Active Live Session (ID 9):**
  - Register: Software Engineering (`register_id: 1`)
  - State: `OPEN`
  - Date: Current
  - PIN Code: **`482109`**
  - QR Token: `vidyaos_se_token_live_2026`
  - Valid for real-time check-in testing from the student portal or mobile camera scanner.

---

## 6. Timetable Schedule (Monday – Friday)

13 Weekly Periods populated in `timetable_slots`:

| Day | Time | Subject Code | Subject Name | Room / Lab | Teacher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Monday** | 09:00 - 10:00 | `IT-501` | Software Engineering | Room 302 | Dr. Vivek Sharma |
| **Monday** | 10:00 - 11:00 | `IT-502` | Database Management Systems | Room 302 | Prof. Neha Gupta |
| **Monday** | 11:15 - 13:15 | `IT-503P` | Web Tech Lab (2-hour block) | Lab 2 | Prof. Neha Gupta |
| **Tuesday** | 09:00 - 10:00 | `IT-502` | Database Management Systems | Room 302 | Prof. Neha Gupta |
| **Tuesday** | 10:00 - 11:00 | `IT-501` | Software Engineering | Room 302 | Dr. Vivek Sharma |
| **Tuesday** | 11:15 - 12:15 | `AS-504` | Professional Ethics | Room 302 | Dr. Amit Verma |
| **Wednesday** | 09:00 - 10:00 | `IT-501` | Software Engineering | Room 302 | Dr. Vivek Sharma |
| **Wednesday** | 10:00 - 11:00 | `IT-502` | Database Management Systems | Room 302 | Prof. Neha Gupta |
| **Thursday** | 09:00 - 10:00 | `IT-502` | Database Management Systems | Room 302 | Prof. Neha Gupta |
| **Thursday** | 10:00 - 11:00 | `IT-501` | Software Engineering | Room 302 | Dr. Vivek Sharma |
| **Thursday** | 11:15 - 13:15 | `IT-503P` | Web Tech Lab (2-hour block) | Lab 2 | Prof. Neha Gupta |
| **Friday** | 09:00 - 10:00 | `AS-504` | Professional Ethics | Room 302 | Dr. Amit Verma |
| **Friday** | 10:00 - 11:00 | `IT-501` | Software Engineering | Room 302 | Dr. Vivek Sharma |

---

## 7. Leave Applications

Populated in `leave_applications`:
1. **Aarav Sharma (`student1`):** Medical Leave (Viral fever), Status: `APPROVED`, Reviewed by Dr. Vivek Sharma.
2. **Ananya Singh (`student4`):** Event Leave (Inter-College Hackathon), Status: `PENDING`.

---

## 8. Database Schema Extensions & Bug Fixes

### A. Database Virtual Columns & Missing Columns
1. **`attendance_registers.session_type_scope`:**
   - *Problem:* Backend attendance models query `r.session_type_scope`, but production MySQL defined `session_type`.
   - *Fix:* Executed:
     ```sql
     ALTER TABLE attendance_registers
     ADD COLUMN session_type_scope VARCHAR(50) GENERATED ALWAYS AS (session_type) VIRTUAL,
     ADD COLUMN is_official TINYINT(1) DEFAULT 1;
     ```
2. **`classroom_posts` Attachment Fields:**
   - *Problem:* `teachingGroupModel.js` selects `cp.attachment_path` and `cp.attachment_name`, which were missing.
   - *Fix:* Executed:
     ```sql
     ALTER TABLE classroom_posts
     ADD COLUMN attachment_path TEXT NULL,
     ADD COLUMN attachment_name VARCHAR(255) NULL;
     ```
3. **`devices` Schema Synchronization:**
   - *Problem:* Hardware device queries in `deviceModel.js` and `hodModel.js` queried `last_heartbeat_at`, `year`, `semester`, and `academic_year_id` which were absent in MySQL table `devices` (only `last_heartbeat` was present).
   - *Fix:* Executed:
     ```sql
     ALTER TABLE devices
     ADD COLUMN last_heartbeat_at DATETIME AS (last_heartbeat) VIRTUAL,
     ADD COLUMN year INT NULL DEFAULT 1,
     ADD COLUMN semester INT NULL DEFAULT 1,
     ADD COLUMN academic_year_id INT NULL;
     ```
4. **`teaching_groups.syllabus_units`:**
   - *Problem:* `teachingGroupModel.js` queries `tg.syllabus_units` in list and overview queries, which was missing in MySQL `teaching_groups`.
   - *Fix:* Executed:
     ```sql
     ALTER TABLE teaching_groups ADD COLUMN syllabus_units LONGTEXT;
     ```
5. **`attendance_sessions.period_number`:**
   - *Problem:* Session queries expected `period_number`.
   - *Fix:* Executed:
     ```sql
     ALTER TABLE attendance_sessions ADD COLUMN period_number INT NULL DEFAULT 1;
     ```
6. **Missing Tables Created:**
   - `classroom_post_comments` (Threaded discussion comments on classroom stream posts)
   - `course_files` (Course files / syllabus / unit binders)
   - `course_file_documents` (Associated documents and uploads for course files)

### B. Backend Runtime Bug Fixes
1. **`VidyaOS_BackEnd/src/middleware/auth.js` (Line 46):**
   - *Problem:* Fatal runtime crash `ReferenceError: sess is not defined` whenever inspecting active user sessions.
   - *Fix:* Added `const sess = sessionRows[0];` immediately after validating `sessionRows.length > 0`.
2. **`VidyaOS_BackEnd/src/models/hodModel.js` (Line 43):**
   - *Problem:* SQL Syntax Error caused by legacy dialect `legacy date offset` in MySQL environment during `/api/v1/hod/dashboard`.
   - *Fix:* Replaced with standard MySQL interval arithmetic: `NOW() - INTERVAL 10 MINUTE`.

---

## 9. Frontend Architecture & Component Deduplication

### Architectural Standards
1. **Strict 3-Domain Component Isolation:**
   - `admin/components/` — Admin header, admin sidebar, institution management widgets.
   - `faculty/components/` — Faculty header, faculty sidebar, register control widgets, grading tools.
   - `student/components/` — Student header, student sidebar, attendance meter, live session joiner.
   - **Zero cross-role imports or style leakage.**
2. **Directory-Level CSS/JS Encapsulation:**
   - Each page folder maintains its own isolated HTML, CSS, and JS (`index.html`, `style.css`, `script.js`).
   - Reusable components inject scoped styles and attach via semantic mount elements (`#student-header-mount`, `#faculty-header-mount`, `#admin-header-mount`).
3. **Responsive UI/UX Standards:**
   - Desktop viewports (1280px+): Persistent collateral sidebars, responsive data grids, full tables.
   - Mobile viewports (384px–390px): Bottom app bar, sliding drawer, minimum 44px touch targets, horizontally scrollable chips/tabs, `overflow-x: hidden` to eliminate horizontal page wobble.

### Deduplicated & Modularized Pages
1. **Faculty Portal (18 Pages Deduplicated):**
   Replaced duplicate inline `<header class="faculty-top-header admin-top-header">` markup with modular `<div id="faculty-header-mount"></div>` across:
   - `faculty/dashboard/index.html` & `dashboard.html`
   - `faculty/course-file/index.html` & `course-file.html`
   - `faculty/registers/index.html` & `registers.html`
   - `faculty/students/index.html` & `students.html`
   - `faculty/timetable/index.html` & `timetable.html`
   - `faculty/leave-approvals/index.html` & `leave-approvals.html`
   - `faculty/reports/index.html` & `reports.html`
   - `faculty/sheets/index.html` & `sheets.html`
   - `faculty/profile/index.html` & `profile.html`
   - `faculty/media/index.html` & `media.html`
   - `faculty/groups/index.html` & `groups.html`
   - `faculty/group-detail/index.html` & `group-detail.html`
   - `faculty/theory-classes/index.html` & `theory-classes.html`
   - `faculty/lab-classes/index.html` & `lab-classes.html`
   - `faculty/direct-assessment/index.html` & `direct-assessment.html`
   - `faculty/indirect-assessment/index.html` & `indirect-assessment.html`
   - `faculty/assessment-process/index.html` & `assessment-process.html`
   - `faculty/student-performance/index.html` & `student-performance.html`

2. **Admin Portal (7 Pages Deduplicated):**
   Replaced duplicate inline `<header class="admin-top-header">` markup with modular `<div id="admin-header-mount"></div>` across:
   - `admin/academic-structure/index.html` & `academic-structure.html`
   - `admin/audit-logs/index.html` & `audit-logs.html`
   - `admin/dashboard/index.html` & `dashboard.html`
   - `admin/faculty/index.html` & `faculty.html`
   - `admin/profile/index.html` & `profile.html`
   - `admin/reports/index.html` & `reports.html`
   - `admin/settings/index.html` & `settings.html`

3. **Student Portal (15 Pages Modularized):**
   Cleanly isolated under `student/components/` with independent header, bottom navigation bar, and responsive layout:
   - `student/dashboard/index.html`
   - `student/attendance/index.html`
   - `student/assignments/index.html`
   - `student/scores/index.html`
   - `student/timetable/index.html`
   - `student/leave/index.html`
   - `student/profile/index.html`
   - `student/group-detail/index.html`
   - `student/nba/index.html`
   - `student/theory-classes/index.html`
   - `student/lab-classes/index.html`
   - `student/direct-assessment/index.html`
   - `student/indirect-assessment/index.html`
   - `student/assessment-process/index.html`
   - `student/student-performance/index.html`

---

## 10. Multi-Viewport In-Browser Verification Matrix

| Portal | Role Tested | Test Account | Viewport | `scrollWidth` vs `innerWidth` | Horizontal Overflow | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Student | `student1@gmail.com` | Mobile (384px) | `384px == 384px` | **None (`false`)** | **PASSED** (4 Classes, Safe Zone Meter, 5-Tab Bar) |
| **Faculty / HOD** | HOD IT | `it_hod@gmail.com` | Mobile (384px) | `384px == 384px` | **None (`false`)** | **PASSED** (4 Teachers, 5 Students, 4 Subjects, 3 Registers) |
| **Faculty / HOD** | HOD IT | `it_hod@gmail.com` | Desktop (1280px) | `1280px == 1280px` | **None (`false`)** | **PASSED** (Sidebar Expanded, Full Radar) |
| **Faculty** | IT Teacher | `it_teacher@gmail.com` | Mobile (384px) | `384px == 384px` | **None (`false`)** | **PASSED** (DBMS & Web Tech Lab cards, 100% Att) |
| **Faculty** | IT Teacher | `it_teacher@gmail.com` | Desktop (1280px) | `1280px == 1280px` | **None (`false`)** | **PASSED** (Full Grid, Actions & Classwork Links) |
| **Admin** | System Admin | `admin@gmail.com` | Mobile (384px) | `384px == 384px` | **None (`false`)** | **PASSED** (Admin Hero, Clean Nav, Dynamic Header) |
| **Admin** | System Admin | `admin@gmail.com` | Desktop (1280px) | `1280px == 1280px` | **None (`false`)** | **PASSED** (Full Admin Console, Collapsible Mini-Rail) |
| **Student Classroom** | Student | `student1@gmail.com` | Mobile (384px) | `384px == 384px` | **None (`false`)** | **PASSED** (Stream, Classwork, People, Attendance Tabs) |
| **Student Classroom** | Student | `student1@gmail.com` | Desktop (1280px) | `1280px == 1280px` | **None (`false`)** | **PASSED** (Full Agile SRS units, classmates list, comments) |

---

## 11. Student Classroom Routing Fix & Full Synchronization

### A. Resolution of Shadowed Student Classroom Route
- **Location:** `server.js` (line 104) and `vercel.json` (lines 778–788)
- **Root Cause:** A hardcoded routing rule previously mapped `/student/group-detail` directly to `/faculty/group-detail/index.html`. This broke role isolation by displaying teacher controls to enrolled students and shadowing the genuine student classroom interface (`student/group-detail/index.html`).
- **Fix Applied:**
  - `server.js`: Updated rewrite regex to resolve `/student/group-detail` $\to$ `/student/group-detail/index.html`.
  - `vercel.json`: Rewrote sources `/student/group-detail`, `/student/group-detail/`, and `/student/group-detail.html` $\to$ `/student/group-detail/index.html`.
  - Verified role boundary: `/faculty/group-detail` serves faculty workspace, `/student/group-detail` serves dedicated student classroom workspace.

### B. Legacy Student Page Synchronization (15 Pages)
To prevent drift between root-relative clean URLs (`/student/[module]`) and legacy direct file requests (`/student/[module]/[module].html`), all 15 student page HTML files were synchronized with their modular counterparts:
- `student/assessment-process/assessment-process.html`
- `student/assignments/assignments.html`
- `student/attendance/attendance.html`
- `student/dashboard/dashboard.html`
- `student/direct-assessment/direct-assessment.html`
- `student/group-detail/group-detail.html`
- `student/indirect-assessment/indirect-assessment.html`
- `student/lab-classes/lab-classes.html`
- `student/leave/leave.html`
- `student/nba/nba.html`
- `student/profile/profile.html`
- `student/scores/scores.html`
- `student/student-performance/student-performance.html`
- `student/theory-classes/theory-classes.html`
- `student/timetable/timetable.html`

### C. Client Runtime Fixes
- **`student/group-detail/student-group.js`:** Added missing `submitModalWorkComment()` helper aliasing `submitPcClassComment()`, preventing an unhandled `ReferenceError: submitModalWorkComment is not defined` from halting window global function exports.

---

## 12. Admin Faculty & HOD Management Roster, Directory, and Governance Suite

### A. Backend Database Schema Enhancements (MySQL)
1. **`common_faculty_manager_assignments` Schema Drift:**
   - *Problem:* Backend query `SELECT ... cfm.assigned_at, cfm.assigned_by FROM common_faculty_manager_assignments` threw runtime error `Unknown column 'cfm.assigned_at' in 'SELECT'`.
   - *Fix:* Executed:
     ```sql
     ALTER TABLE common_faculty_manager_assignments
     ADD COLUMN assigned_by INT NULL,
     ADD COLUMN assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     ADD COLUMN deactivated_at DATETIME NULL;
     UPDATE common_faculty_manager_assignments SET assigned_by = appointed_by, assigned_at = appointed_at;
     ```
2. **`faculty_registration_requests` Column Drift:**
   - *Problem:* Pending HOD registrations endpoint failed with `Unknown column 'frr.account_type' in 'SELECT'`.
   - *Fix:* Added virtual column:
     ```sql
     ALTER TABLE faculty_registration_requests
     ADD COLUMN account_type VARCHAR(50) AS (requested_role) VIRTUAL;
     ```

### B. Backend REST API Extensions (`VidyaOS_BackEnd`)
1. **`AdminModel.getAllTeachers()` (`src/models/adminModel.js`):**
   - Enriched query to aggregate and return `teacher_id`, `full_name`, `employee_id`, `phone`, `department_id`, `department_name`, `department_code`, `gmail`, `status`, `is_hod`, `hod_department_name`, `is_common_faculty_manager`, and consolidated `roles` array.
2. **`AdminModel.createFacultyTransaction()`:**
   - Atomically creates `users` authentication record with hashed password, inserts `teachers` profile, and links either `departments.hod_teacher_id` (if role is HOD) or `common_faculty_manager_assignments` (if role is CFM) within a managed database transaction.
3. **`AdminModel.updateFaculty()`:**
   - Updates personal info, contact numbers, staff codes, department transfers, and active/inactive status.
4. **`AdminModel.toggleFacultyStatus()`:**
   - Toggles status between `ACTIVE` and `INACTIVE` while preserving all course rosters and gradebooks.
5. **`AdminModel.deleteFaculty()`:**
   - Revokes active HOD / CFM appointments and sets teacher/user status to `INACTIVE`.
6. **Routes Mounted in `src/routes/admin.js`:**
   - `GET /api/v1/admin/teachers`
   - `POST /api/v1/admin/teachers`
   - `PUT /api/v1/admin/teachers/:id`
   - `PATCH /api/v1/admin/teachers/:id/status`
   - `POST /api/v1/admin/teachers/:id/reset-password`
   - `DELETE /api/v1/admin/teachers/:id`

### C. Frontend UI/UX Overhaul (`admin/faculty/`)
1. **Interactive KPI Stat Strip:**
   - 4 quick-metric cards: Total Faculty, Active HODs, Teaching Staff, and Common Faculty Manager.
2. **Segmented Navigation Tabs with Live Badges:**
   - `All Registered Faculty` (with count badge)
   - `HOD Leadership` (with count badge)
   - `Pending Approvals` (with count badge)
   - `Common Faculty & Gates`
3. **Multi-Criteria Search & Filtering Toolbar:**
   - Live search input matching full name, institutional Gmail, employee code, and department name.
   - Filter dropdown by academic department.
   - Segmented filter chips with live counts: All Staff, Teachers, HODs, Common Faculty, Active, Inactive.
4. **Desktop Data Table & Mobile Touch Cards:**
   - Desktop view ($\ge 1280\text{px}$): Data table with user cell avatar, department badge, role pills (`HOD - IT`, `CFM`, `Teacher`), status pills, and quick action icon buttons (`View`, `Edit`, `Toggle Status`, `Reset Key`, `Delete`).
   - Mobile view ($384\text{px}$): Responsive card stack with touch targets $\ge 44\text{px}$, formatted email/phone links, and zero horizontal page wobble (`scrollWidth === 384px`).
5. **Modals Implemented:**
   - `#add-faculty-modal`: Comprehensive registration modal supporting Teachers, HODs, and Common Faculty Managers with automatic department and role binding.
   - `#edit-faculty-modal`: Profile and department editing.
   - `#view-faculty-modal`: Clean read-only faculty overview.
   - `#reset-faculty-password-modal`: Fast administrative password reset.
   - `#delete-faculty-confirm-modal`: Institutional safeguard confirmation with preserved historical records.
6. **File Synchronization:**
   - Synchronized `admin/faculty/index.html` with `admin/faculty/faculty.html`.

### D. Verification Summary
- **Desktop (1280x800px):** `scrollWidth = 1280px`, `clientWidth = 1280px`, zero overflow (`false`).
- **Mobile (384x668px):** `scrollWidth = 384px`, `clientWidth = 384px`, zero overflow (`false`).

---

## 8. Admin Faculty & HOD Management UX Overhaul, Safety Modals & 30-Day Trash Retention

**Completed:** November 14, 2026

### A. User Experience & Layout Simplification
1. **Hero Removal:**
   - Completely eliminated the bulky institutional banner header ("Faculty & HOD Management / Institutional faculty roster...").
2. **Ultra-Compact Status Bar:**
   - Single clean flex bar `.fac-compact-status-bar` featuring:
     - `Total Faculty` KPI metric
     - `Total HODs` KPI metric
     - Department-separate counts chips (`IT: 4`, `CE: 0`, `ECE: 0`, `EE: 0`, `ME: 0`, `PHARM: 0`)
     - Trash trigger button with badge count
     - Exactly ONE `+ Add Faculty` primary button
3. **Streamlined Registration Gates & CFM:**
   - Removed bloated separate panels and redundant tabs.
   - Inserted `.fac-gate-bar` directly after status cards with dynamic tags (`IT Open`, `ECE Open`, `HODs Open` / `All Depts Open` / `Registration Closed`) and a `Configure Gates` button.
   - Configure Gates modal with master "Open for All Departments" toggle, department-wise checkboxes (`CE`, `ECE`, `EE`, `IT`, `ME`, `PHARM`), and special role gates (`Allow HOD`, `Allow Common Faculty`).
   - Compact Common Faculty Manager section (`.fac-cfm-compact-strip`) staying compact when unassigned and displaying appointed manager details with `Change` and `Remove` actions.
4. **Minimal Faculty Information Cards (Mobile):**
   - Clean card layout matching user specification:
     `| profile , name , three dot menu |`
     `|         , bellow name small subtext of department in short (e.g. IT • email) |`
   - Role badges (`HOD`, `CFM`, `Suspended`) aligned inline with name.
   - 3-dot kebab menu (`⋮`) containing:
     - `View Details`
     - `Edit Profile`
     - `Reset Password`
     - `Suspend Faculty` / `Activate Faculty`
     - `Remove (Move to Trash)`

### B. Typed Safety Dialogs for Destructive Actions
- **Suspend Confirmation (`#safety-suspend-modal`):**
  - Requires user to explicitly type `SUSPEND` into the confirmation input.
  - The confirm button remains locked and disabled (`opacity: 0.45; cursor: not-allowed;`) until the exact keyword `SUSPEND` is entered.
- **Remove Confirmation (`#safety-remove-modal`):**
  - Requires user to explicitly type `REMOVE` into the confirmation input.
  - The "Move to Trash" button remains locked and disabled until `REMOVE` is entered.

### C. 30-Day Retention Trash & Restore Engine
1. **Database Schema (`teachers` & `users` tables):**
   - Added `deleted_at DATETIME NULL` to both `teachers` and `users`.
   - Active queries enforce `deleted_at IS NULL`.
2. **Soft-Delete Workflow (`AdminModel.deleteFaculty`):**
   - Soft-deletes record (`t.deleted_at = CURRENT_TIMESTAMP`, `u.deleted_at = CURRENT_TIMESTAMP`, `u.status = 'SUSPENDED'`).
   - Revokes active teaching assignments, CFM roles, and departmental HOD pointers (`hod_user_id = NULL`).
   - Emits audit log entry `FACULTY_MOVED_TO_TRASH`.
3. **Trash Retention & Automatic 30-Day Purge (`AdminModel.getTrashFaculty`):**
   - Automatically purges records older than 30 days (`deleted_at < NOW() - INTERVAL 30 DAY`).
   - Calculates remaining days (`GREATEST(0, 30 - DATEDIFF(NOW(), t.deleted_at)) as days_left`).
4. **Faculty Trash & Restore Modal (`#trash-faculty-modal`):**
   - Lists soft-deleted faculty with avatar, name, department, email, deleted date, and days left badge (`30d left`).
   - Features `Restore` action to immediately bring faculty back to the active roster (`deleted_at = NULL`, `status = 'ACTIVE'`).
   - Features `Purge Permanently` option for immediate administrative deletion.

---

## 9. Faculty Console Refinements: 4x2 Status Grid, Menu Dropup Flip, Compact Registration Modal, CFM Appoint Bugfix & Two-Way Gate Synchronization

**Completed:** November 14, 2026

### A. Status Cards Layout (4 in a Row, 2 Rows)
1. **Grid Restructuring (`.fac-status-grid-8`):**
   - Replaced horizontal scrolling strip with a 4-column, 2-row CSS grid (`repeat(4, 1fr)`) containing exactly 8 compact status cards:
     - **Row 1:** `Faculty` (Total), `HODs` (Total), `CE`, `ECE`
     - **Row 2:** `EE`, `IT`, `ME`, `PHARM`
   - Each card displays tabular count on top and capitalized abbreviation below with hover transitions.
2. **Action Bar Repositioning (`.fac-status-actions-bar`):**
   - Clean action row placed directly beneath the 4x2 grid with a dashed separator:
     - `Trash` button with live retention badge count.
     - Exactly ONE `+ Add Faculty` primary button (resolved duplicate `+ + Add Faculty` label).

### B. 3-Dot Kebab Menu Clipping Prevention (Dynamic Upward Dropup Flip)
1. **Dynamic Upward Flip (`.fac-kebab-menu.dropup`):**
   - In `toggleFacultyKebabMenu(teacherId, event)`, added dynamic viewport clearance calculation:
     `const spaceBelow = window.innerHeight - rect.bottom;`
     If `spaceBelow < 220px`, the menu dynamically flips upwards (`bottom: 100%; top: auto; margin-bottom: 6px;`).
2. **Stack Padding Clearance:**
   - Added `padding-bottom: 7rem` to `.fac-mini-cards-stack` and `padding-bottom: 5rem` to `.fac-table-wrap`, ensuring bottom cards never overlap or get clipped by the mobile bottom navigation bar.
   - Added `max-height: 80vh; overflow-y: auto;` inside the dropdown menu for small screens.

### C. Open Registration Modal Redesign
1. **Button Rename:**
   - Renamed action button from `Configure Gates` to `Open Registration` with updated icon.
2. **Compact & Simple Modal Architecture (`#reg-gates-modal`):**
   - Ultra-compact card (`max-width: 440px`) with tight padding and clean visual hierarchy:
     - **Master Switch:** Compact toggle box `[ ] Open for All Departments` with subtitle "Allows faculty self-registration campus-wide".
     - **Department Access (3-Column Grid):** Compact pill buttons (`.fac-gate-dept-pill`) for `CE`, `ECE`, `EE`, `IT`, `ME`, `PHARM` with active blue fill and checkbox sync.
     - **Special Roles (2-Column Grid):** Compact inline toggle boxes for `HOD Registration` and `Common Faculty`.
     - **Actions:** Clean inline `Cancel` and `Save Settings` buttons.
   - Fits on mobile viewports (< 400px height) without any excessive vertical scrolling.

### D. Appoint Common Faculty Manager Bug Fix
1. **MariaDB Schema Default Value:**
   - Executed:
     `ALTER TABLE defaultdb.common_faculty_manager_assignments MODIFY appointed_by INT(11) NULL DEFAULT 1;`
     `ALTER TABLE defaultdb.common_faculty_manager_assignments MODIFY assigned_by INT(11) NULL DEFAULT 1;`
   - Fixed `Field 'appointed_by' doesn't have a default value` SQL error.
2. **Backend Model Compatibility (`AdminModel.assignCommonFacultyManager`):**
   - Updated MariaDB query to insert both `appointed_by` and `assigned_by` using `adminUserId || 1`.
   - Replaced legacy dialect `legacy ignore insert` with MariaDB `INSERT IGNORE` for `user_roles`.
   - Successfully verified live appointment of Dr. Amit Verma via modal and REST API.

### E. Two-Way Self-Registration Gate Synchronization (Admin ⇄ HODs)
1. **HOD Model Sync (`HodModel.toggleFacultyRegistration` & `getFacultyRegistrationStatus`):**
   - Replaced legacy dialect `legacy upsert clause` with MariaDB `ON DUPLICATE KEY UPDATE`.
   - When an HOD opens registration for their department:
     - Updates `faculty_reg_dept_${deptId} = '1'`.
     - Automatically appends the department code to `admin_reg_open_departments`.
   - When an HOD closes registration for their department:
     - Updates `faculty_reg_dept_${deptId} = '0'`.
     - Automatically filters the department out of `admin_reg_open_departments`.
     - Sets `admin_reg_all_open = '0'`.
2. **Admin Model Sync (`AdminModel.updateRegistrationGates` & `getRegistrationGates`):**
   - When Admin updates gates, synchronizes both `admin_reg_open_departments` and each departmental key `faculty_reg_dept_${d.id}` for all departments.
   - `AdminModel.getRegistrationGates()` queries both `admin_reg_%` and `faculty_reg_dept_%` settings and returns unified department codes without duplicate IDs.
3. **Role Enforcement:**
   - Only departmental HODs (for their own department) and System Administrators (campus-wide) possess authorization to modify faculty self-registration states.

---

## 11. Faculty Roster Simplification, Privacy Enforcement & Modernization

### A. Desktop Table Simplification & Privacy
1. **Privacy Preservation (Zero Exposed Contact Info):**
   - Institutional Gmail and mobile phone numbers are strictly omitted from the main roster table and mobile cards.
   - Contact details are securely accessed solely by clicking the **View Details** action modal/drawer.
2. **Dedicated Employee ID Column:**
   - Moved Employee ID out from beneath the faculty member's name into its own dedicated column (`EMPLOYEE ID`).
   - Styled as a clean, monospace chip (`.fac-empid-pill`).
3. **Simplified Role Badges:**
   - Replaced verbose, dense badges (e.g. `HOD - Information Technology`, `Faculty Teacher`) with concise, clean pills:
     - `HOD` (amber)
     - `Common Mgr` (purple)
     - `Faculty` (blue)
4. **Short Department Codes:**
   - Replaced full department titles (e.g. `Information Technology (IT)`) with concise short codes (`IT`, `CE`, `ECE`, `EE`, `ME`, `PHARM`).

### B. Inactive Faculty Styling & Sort Order
1. **Light Red Shade:**
   - Inactive or suspended faculty rows and mobile cards receive a subtle, clear light red background tint (`.fac-row-inactive`, `.fac-card-inactive`) with reddish borders.
2. **Sort Order (Active First, Inactive Last):**
   - Filter and search pipelines sort active faculty members to the top in alphabetical order, while all inactive/suspended faculty members are positioned at the very end of the list.

### C. Zero Native Browser Dialogs (Custom Styled Modals)
1. **Custom Dialog Architecture (`#custom-dialog-modal`):**
   - Added a unified, theme-aware dialog component supporting danger, warning, and info visual accents.
   - Supports custom titles, descriptive messages, confirm/cancel buttons, and an optional prompt input field.
2. **Promise-Based Helpers in `faculty.js`:**
   - `showStyledConfirm({ title, message, confirmText, isDanger, icon })` → returns `Promise<boolean>`.
   - `showStyledPrompt({ title, message, defaultValue, label, isDanger })` → returns `Promise<string|null>`.
3. **Replaced All Native Browser Calls:**
   - Replaced `prompt()` in `promptRejectHod()` with `showStyledPrompt()`.
   - Replaced `confirm()` in `removeCommonMgr()` with `showStyledConfirm()`.
   - Replaced `confirm()` in `permanentDeleteFacultyRecord()` with `showStyledConfirm()`.

### D. Modern Status Cards (Strict 2 Rows on Mobile)
1. **Aesthetic Upgrade:**
   - Modernized status cards with sleek border accents, top indicator highlights, tabular monospace numerals, and subtle hover lifts.
2. **Mobile Constraints:**
   - Enforced `repeat(4, 1fr)` grid so all 8 status cards fit cleanly across exactly 2 rows on mobile viewports (< 768px).

### E. Self-Registration Tag UX Aggregation
1. **Concise Tag Aggregation:**
   - Eliminated the 5-row wrap bug by aggregating open departments into a single clean tag:
     - `● All Departments Open` (when campus-wide or all depts open)
     - `● Open: CE, IT` (concise comma-separated list when specific depts open)
     - `● HODs Open` and `● Common Open` as compact secondary pills.



---

## 15. Admin Console: Faculty Table Actions Kebab Menu & Executive Dashboard Redesign (Image 2)

**Completed:** November 14, 2026

### A. Faculty Management Table: Desktop 3-Dot Kebab Menu
1. **Replaced Inline Action Buttons on Desktop:**
   - In `VidyaOS/admin/faculty/faculty.js` (`renderAllFaculty`), replaced the 5 inline action buttons (`.fac-action-btns`) in `.fac-table` with `.fac-kebab-wrap`, `.fac-kebab-btn` (`⋮`), and `.fac-kebab-menu` (ID `fac-kebab-menu-table-${f.teacher_id}`).
   - Ensured identical menu options and styling as mobile cards (View Profile, Appoint HOD, Remove HOD, Suspend/Activate, Delete).
2. **Dynamic Menu Resolver:**
   - Updated `toggleFacultyKebabMenu(e, id)` in `faculty.js` to dynamically resolve `wrap.querySelector('.fac-kebab-menu')`, ensuring full support across desktop table rows and mobile card layouts without ID collision.

### B. Admin Executive Dashboard Redesign (Image 2 Specification for Mobile & PC)
1. **Dynamic Institutional Branding Integration:**
   - Updated `VidyaOS/admin/dashboard/dashboard.js` with `loadInstitutionalBranding()`:
     - Fetches college name (`institution_name`), tagline (`institution_tagline`), logo (`institution_logo_url`), and campus photo (`institution_banner_url`) from `/api/v1/admin/settings` with instant paint fallback from `localStorage.getItem('institutionSettings')`.
     - Added real-time event listener for `institution-settings-updated` and `storage` events, automatically synchronizing changes saved in the Admin Settings page to the dashboard without requiring a page refresh.
2. **Hero Showcase Banner (`.dash-hero-card`):**
   - Left side: Circular college logo badge (`#dash-inst-logo`), vertical divider line, college title (`#dash-inst-name`), and subtitle (`#dash-inst-tagline`).
   - Right side: Panoramic college campus photo (`#dash-inst-banner`) with graceful gradient mask and blue ambient bottom-right glow.
3. **3 Modern KPI Stat Cards (`.dash-kpi-row`):**
   - Streamlined from 4 cards down to exactly 3 high-impact institutional metrics:
     - `Total Students` (48 / live count, blue squircle icon, `↑ +12%` trend)
     - `Departments` (6 / live count, purple squircle icon, `↑ +0%` trend)
     - `Total Faculty` (5 / live count, green squircle icon, `↑ +0%` trend)
   - Mobile-optimized dimensions (`0.58rem`, `white-space: nowrap`) ensuring zero awkward mid-word breaks or ellipsis truncation on mobile viewports.
4. **Quick Access Section (`.dash-quick-section`):**
   - Header with electric bolt icon (`⚡ Quick Access`) and `View All →` portal navigation link.
   - 6 quick action cards (2x3 grid on mobile, 6 columns on PC):
     1. Academic Structure (blue layers)
     2. HOD Management (purple group)
     3. Reports & Analytics (green chart)
     4. Audit Logs (amber file)
     5. System Settings (slate gear)
     6. Admin Profile (violet avatar)
5. **Unified Attendance Analytics Card (`.dash-analytics-card`):**
   - Header with bar chart icon (`📊 Attendance Analytics`) and `Today ▾` dropdown filter pill.
   - Dual split body:
     - **Left Column:** Circular SVG donut progress gauge (`82% Present`) + compact metric count legend (`Present: 39` [blue dot], `Absent: 8` [red dot], `Total: 47` [gray dot]).
     - **Vertical Divider Line:** Crisp theme-tokenized divider.
     - **Right Column:** Department Breakdown header (`🏢 Department Breakdown`) + 6 vibrant vertical bar columns with percentages and codes (`IT 100%`, `ECE 87%`, `EE 83%`, `ME 77%`, `CE 90%`, `PHARM 80%`).

---

## Phase 8: Dashboard Cleanup & Desktop Faculty Kebab Menu Clipping Fix (2026-11-14)

### A. Admin Dashboard Cleanup (`/admin/dashboard/index.html` & `dashboard.js`)
1. **System Settings SVG Icon Fix:**
   - Replaced corrupted/distorted gear SVG in Quick Access with a clean, pixel-perfect 24x24 Lucide 8-tooth gear SVG with centered circular cutout.
2. **Removed "View All &rarr;" Link:**
   - Removed `.dash-view-all-link` from the Quick Access header as requested.
3. **Excised Attendance Analytics Section:**
   - Completely removed the `<article class="dash-analytics-card">` container from `index.html` and `dashboard.html`.
   - Cleaned up `dashboard.js` by removing `renderAttendanceAnalytics()`, `renderDepartmentBars()`, and the event listener for `#analytics-time-filter`.

### B. Faculty Directory 3-Dot Kebab Menu Clipping Fix on PC (`/admin/faculty/`)
1. **Container Overflow Remediation:**
   - Changed `.fac-section-card` `overflow: hidden;` to `overflow: visible; position: relative;` in `VidyaOS/admin/faculty/faculty.css`.
   - Added `.fac-table-wrap { position: relative; overflow: visible; width: 100%; }`.
   - Maintained aesthetic card corner rounding on tables by adding:
     - `tr:last-child td:first-child { border-bottom-left-radius: var(--radius-lg, 12px); }`
     - `tr:last-child td:last-child { border-bottom-right-radius: var(--radius-lg, 12px); }`.
2. **Smart Upward Dropup Flip (`toggleFacultyKebabMenu` in `faculty.js`):**
   - Implemented multi-condition dropup detection:
     - Checks if row index is within the bottom 2 rows (`idx >= allRows.length - 2`).
     - Checks if distance to card bottom is `< 220px`.
     - Checks if distance to viewport bottom is `< 220px`.
     - Verifies clearance above (`rect.top > 270px`).
   - If conditions are met, dynamically applies `.dropup` (`top: auto; bottom: 100%; margin-bottom: 6px;`), causing the menu to open smoothly above the button.
3. **Stacking Context & Layer Elevation:**
   - Elevated `.fac-kebab-wrap.menu-open` and `:has(.fac-kebab-menu.open)` to `z-index: 1250; position: relative;`.
   - Elevated `tr.row-kebab-open` and `tr:has(.fac-kebab-menu.open)` to `z-index: 1240; position: relative;`.
   - In `closeAllKebabMenus()`, systematically cleans up `.open`, `.dropup`, `.menu-open`, and `.row-kebab-open` classes across all elements.
4. **Service Health & Verification:**
   - Re-established local MariaDB (`mariadbd-safe`) daemon and restarted backend daemon (`task-4420` on port 3000).
   - Verified all 4 faculty rows in desktop table view and confirmed bottom row 3 (`Prof. Rajesh Kumar`) and row 2 (`Prof. Neha Gupta`) open upward (`dropup`) with all 5 menu options fully accessible and unclipped.

---

## Phase 9: 100% Autonomous Admin Isolation & Cleanup (2026-11-14)

### A. Autonomous Admin Core Foundations (`admin/components/core/`)
1. **Core Foundation Extraction:**
   - Established `/admin/components/core/` containing fully autonomous foundation assets:
     - `core/reset.css`: Isolated element normalization and base box-sizing.
     - `core/variables.css`: Theme token dictionary, light/dark mode variables, and status color scales.
     - `core/api.js`: Institutional API fetch wrapper with token injection and error handling.
     - `core/auth.js`: Admin route guarding, token resolution, and session management.
2. **Eliminated Outside Asset Loading:**
   - Updated all 7 admin pages (`academic-structure`, `audit-logs`, `dashboard`, `faculty`, `profile`, `reports`, `settings`) to load core foundations directly from `/admin/components/core/`:
     - `<link rel="stylesheet" href="/admin/components/core/reset.css?v=20261114">`
     - `<link rel="stylesheet" href="/admin/components/core/variables.css?v=20261114">`
     - `<script src="/admin/components/core/api.js?v=20261114"></script>`
     - `<script src="/admin/components/core/auth.js?v=20261114"></script>`
   - Exactly **0** CSS or JS assets are loaded from outside `/admin/`.

### B. Leaked & Duplicate Admin Code Purge Outside `/admin/`
1. **Purged Dead Admin Navigation from `/shared/`:**
   - Removed `VidyaOS/shared/js/admin-nav.js` (427 lines of dead legacy admin nav controller).
   - Removed `VidyaOS/shared/css/admin-nav.css` (372 lines of dead legacy admin nav styling).
2. **Purged Duplicate Delete Modal from `/shared/`:**
   - Removed `VidyaOS/shared/css/delete-modal.css` and `VidyaOS/shared/js/delete-modal.js` (byte-for-byte duplicates of `/admin/components/delete-modal/`).
3. **Purged Orphaned Root `/components/` Directory:**
   - Removed `/components/` (`ajax.js`, `dialog.js`, `index.js`, `stat-card.js`, `table.js`, `toast.js` — 1,265 lines) which had zero references across the application.

### C. Internal `/admin/` Duplicate & Dead Code Cleanup
1. **Removed 7 Redundant Duplicate HTML Files:**
   - Deleted the redundant `<page>.html` files inside each subfolder (`academic-structure.html`, `audit-logs.html`, `dashboard.html`, `faculty.html`, `profile.html`, `reports.html`, `settings.html`), preserving the canonical `index.html` files.
   - All server routing (`server.js` and `vercel.json`) targets `/admin/<page>/index.html`.
2. **Removed Dead Component Stubs & Prototypes:**
   - Deleted `admin/components/icons/icons.js` (10-line stub).
   - Deleted unused subcomponent folders: `hero/`, `attendance-overview/`, `dept-breakdown/`, `quick-actions/`, `recent-activity/` (1,308 lines).
3. **Updated Root Admin Redirect:**
   - Updated `/admin/index.html`, `server.js`, and `vercel.json` to route `/admin` directly to the primary `/admin/dashboard/index.html`.
