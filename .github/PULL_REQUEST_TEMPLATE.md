## 🛡️ VidyaOS Component Developer Pull Request

### 📌 Summary of Changes
- **Target Role / Domain**: [ ] Admin (`admin/components/`) | [ ] Faculty (`faculty/components/`) | [ ] Student (`student/components/`) | [ ] Shared Primitives (`components/`)
- **Component(s) Modified / Added**: 
- **Purpose**: Explain how this component eliminates duplicate code or reduces page payload.

---

### 🔍 Component Isolation Checklist
Please confirm that your Pull Request satisfies all isolation and guardrail rules:
- [ ] **Components Only**: My changes are strictly inside `components/` directories.
- [ ] **No Page / Route Changes**: I have NOT modified core page HTML/JS outside `components/`.
- [ ] **Role Isolation**: Admin components do not leak into student/faculty views, and vice versa.
- [ ] **Theme Token Compliance**: No hardcoded hex (`#hex`) or `rgb(...)` colors. All styling uses CSS variables (e.g. `var(--bg-app)`, `var(--text-main)`, `var(--border-color)`).
- [ ] **Responsive Design**: Tested on both Desktop (>= 1024px) and Mobile (<= 768px).
