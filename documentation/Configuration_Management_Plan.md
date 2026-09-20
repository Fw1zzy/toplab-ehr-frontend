# Configuration Management Plan

Field | Detail
--- | ---
**Project Name** | Toplab EHR
**Team Members** | EMMANUEL B. PASCUA (Leader)
ALLYSA GRACE S. BASBAS 
ARIEL DAVE D. MILO 
JHON REY F. SAMSON 
KATRINA ABBIE S. TUCAY
**Repository URL** | https://github.com/Fw1zzy/toplab-ehr-frontend

## 1. Configuration Items

Configuration items (CIs) are grouped into five categories: Source Code, Documentation, Dependencies/Environment, Data/Schema, and Build/Configuration Scripts.

| Name | Category | File Path | Owner | Version | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Root .gitignore | Build/Config Scripts | `.gitignore` | ALLYSA GRACE S. BASBAS | v1.0.0 | Under changes/ongoing |
| Root README | Documentation | `README.md` | KATRINA ABBIE S. TUCAY | v1.0.0 | Under changes/ongoing |
| Next.js Config | Build/Config Scripts | `next.config.ts` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| TypeScript Config | Build/Config Scripts | `tsconfig.json` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Package Dependencies | Dependencies/Environment | `package.json`, `package-lock.json` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Tailwind Config | Build/Config Scripts | `postcss.config.mjs` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| ESLint Config | Build/Config Scripts | `eslint.config.mjs` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Global CSS | Build/Config Scripts | `src/app/globals.css` | ARIEL DAVE D. MILO | v1.0.0 | Under changes/ongoing |
| Environment Variables | Dependencies/Environment | `.env` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| App Entry Points | Source Code | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/providers.tsx` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Dashboard Route | Source Code | `src/app/(protected)/dashboard/page.tsx` | JHON REY F. SAMSON | v1.0.0 | Under changes/ongoing |
| Patients Route | Source Code | `src/app/(protected)/patients/page.tsx`, `[id]/page.tsx` | ALLYSA GRACE S. BASBAS | v1.0.0 | Under changes/ongoing |
| Inventory Route | Source Code | `src/app/(protected)/inventory/page.tsx` | ARIEL DAVE D. MILO | v1.0.0 | Under changes/ongoing |
| Services Route | Source Code | `src/app/(protected)/services/page.tsx` | KATRINA ABBIE S. TUCAY | v1.0.0 | Under changes/ongoing |
| Reports & Staff Routes | Source Code | `src/app/(protected)/reports/page.tsx`, `staff/page.tsx` | JHON REY F. SAMSON | v1.0.0 | Under changes/ongoing |
| Other Clinical/Finance Routes | Source Code | `src/app/(protected)/*` (queue, billing, etc.) | ALLYSA GRACE S. BASBAS | v1.0.0 | Under changes/ongoing |
| Public Routes (Login) | Source Code | `src/app/login/page.tsx`, `layout.tsx` | ALLYSA GRACE S. BASBAS | v1.0.0 | Under changes/ongoing |
| UI Components (StatCard, etc.)| Source Code | `src/components/ui/StatCard.tsx`, `StatusBadge.tsx`, etc. | KATRINA ABBIE S. TUCAY | v1.0.0 | Under changes/ongoing |
| Layout Components (Sidebar)| Source Code | `src/components/layout/AppSidebar.tsx`, `Topbar.tsx` | ARIEL DAVE D. MILO | v1.0.0 | Under changes/ongoing |
| Custom Hooks | Source Code | `src/hooks/useRequireAuth.ts` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| API Layer & Likha Integration | Source Code | `src/lib/api/index.ts`, `likha/index.ts` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Mock Data Store | Data/Schema / Source | `src/lib/api/mock/data.ts` | JHON REY F. SAMSON | v1.0.0 | Under changes/ongoing |
| Data Queries & Mutations | Source Code | `src/lib/queries/usePatients.ts`, `useDashboard.ts`, etc. | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Auth Logic & Providers | Source Code | `src/lib/auth/AuthProvider.tsx` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Utility Functions | Source Code | `src/lib/utils/index.ts` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| API Proxy Setup | Source Code | `src/proxy.ts` | EMMANUEL B. PASCUA | v1.0.0 | Under changes/ongoing |
| Type Definitions | Data/Schema | `src/types/*.ts` (patient, user, etc.) | ALLYSA GRACE S. BASBAS | v1.0.0 | Under changes/ongoing |
| Diagrams Explained | Documentation | `documentation/Diagrams_Explained.md` | ARIEL DAVE D. MILO | v1.0.0 | Under changes/ongoing |
| Configuration Plan | Documentation | `documentation/Configuration_Management_Plan.md` | KATRINA ABBIE S. TUCAY | v1.0.0 | Under changes/ongoing |

## 2. Baseline

The **baseline** for this project is defined as the current state of the main branch. All configuration items listed above are versioned relative to this baseline as **v1.0.0**. Any future modification to a CI is measured as a change against this reference point.

## 3. Version Conventions

This project follows **Semantic Versioning (SemVer)**: MAJOR.MINOR.PATCH
- **MAJOR** — incremented for breaking changes (e.g., a redesigned folder structure, major framework upgrade)
- **MINOR** — incremented for new features that do not break existing functionality (e.g., adding a new page or UI component)
- **PATCH** — incremented for bug fixes and small internal corrections (e.g., fixing a typo, resolving a UI bug)

All configuration items currently start at **v1.0.0** as the initial baseline version.

## 4. Status Accounting

Each configuration item is assigned one of the following statuses:

| Status | Meaning |
| :--- | :--- |
| **Under changes/ongoing** | The item is actively being developed or revised. |
| **Suspended** | Work on the item has been paused. |
| **Superseded** | The item has been replaced by a newer version or approach and is no longer in active use. |

Currently, all listed configuration items are marked **Under changes/ongoing**, reflecting the project’s active development phase.
## 5. Traceability

Every change to a configuration item follows this traceability flow:

**Reason for Change → Approval → Implementation → Update Record**

1. **Reason for Change** — A team member identifies a need (bug, new requirement, adviser feedback) and documents it.
2. **Approval** — The change is reviewed and approved by the team lead (EMMANUEL B. PASCUA).
3. **Implementation** — The approved change is made, committed to the repository with a clear commit message referencing the reason.
4. **Update Record** — The configuration item table’s Version and Status fields are updated accordingly to reflect the new state.
