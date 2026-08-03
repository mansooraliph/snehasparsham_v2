# CLAUDE.md

This file gives Claude Code context about this project. Read this before making changes.

## Project
Disaster Management Portal — a multi-role web portal for coordinating disaster preparedness, response, and recovery. Public users, volunteers, NGOs, field responders, and admins all use the same platform with role-based access.

## Current Scope (build in this order)
1. **Login Module** — shared login for all roles (see `login-module.md`)
2. **Events & Registration Module** — admin-created events with dynamic public forms (see `events-registration-module.md`)
3. Full feature list / architecture overview in `disaster-management-portal-full.md`

> Spec docs above are the source of truth. Confirm scope against them before implementing; ask before deviating.

## Key Decisions Already Made (do not re-ask)
- **Login:** single shared URL for all roles; role decided after auth, then redirect to role dashboard. Email/Password + Phone/OTP for MVP. Government SSO is Phase 2 — do not build yet.
- **Public access:** Public/Citizen users can browse public content (alerts, shelters, events) without logging in.
- **Registration:** Volunteers/NGOs/Field Responders can self-register (goes to `Pending Approval` status) OR be added directly by an Admin.
- **Events:** Admin creates events (name, poster, location, date range, time). Admin builds a custom form per event using a dynamic field system (text/number/email/dropdown/radio/checkbox/date/file/textarea).
- **Event form submission:** No login required (anonymous/guest submission). No duplicate-submission check. Admin can clone an event (including its form structure). Email/SMS confirmation sent after submission.

## Suggested Tech Stack
- Frontend: React.js / Next.js
- Backend: Node.js (Express or NestJS)
- Database: PostgreSQL (PostGIS if geo features needed)
- Auth: JWT + role-based middleware
- File/poster uploads: S3-compatible storage
- Notifications: Firebase Cloud Messaging (push), Twilio (SMS), standard SMTP (email)

> If the repo already has a different stack in place, follow the existing code/config — don't introduce a new stack without asking.

## Data Model Notes
- Use a flexible key-value structure for event forms (`Event_Form_Fields` + `Event_Responses` + `Event_Response_Values`) so admins can add/remove fields without schema migrations.
- `Users.status` enum: `Active / Suspended / Pending Approval`.
- `Events.status` enum: `Draft / Published / Closed / Cancelled`.

## Conventions
- REST API under `/api/...` (see endpoint tables in the module docs for exact routes).
- Keep role-permission checks in a central auth/RBAC middleware, not scattered per-route.
- Prefer small, incremental PRs per module/feature rather than large multi-module changes.

## Open Items (ask user before deciding)
- Whether Public users need a lightweight account to *track* their submitted reports/registrations later.
- Whether region-scoped admins (District/State) need separate permission scoping vs. Super Admin.
- Final choice of SMS/notification provider if Twilio isn't preferred.
