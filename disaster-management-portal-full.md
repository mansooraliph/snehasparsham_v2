# Disaster Management Portal — Full Project Specification

*Consolidated document: Project Overview + Login Module + Events & Registration Module*


## 1. Overview
A web-based portal to coordinate disaster preparedness, response, and recovery activities across multiple stakeholders — government agencies, relief teams, volunteers, and the public — through a single, role-based system.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Super Admin** | Full system control: manages users, roles, permissions, and system configuration. |
| **District/State Admin** | Manages disasters, resources, and teams within an assigned region. |
| **Government Official** | Reviews reports, approves resource allocation, monitors overall situation. |
| **Field Responder / Rescue Team** | Updates on-ground status, requests resources, reports incidents. |
| **Volunteer** | Registers for relief work, receives task assignments, reports availability. |
| **NGO/Partner Organization** | Coordinates aid, donations, and logistics support. |
| **Public/Citizen** | Reports incidents, requests help, views alerts and shelter information. |

> Roles and permissions should be configurable — the table above is a starting baseline, not fixed.

---

## 3. Core Modules & Features

### 3.1 Authentication & Access Control
- Multi-role login (email/phone + OTP or password)
- Role-Based Access Control (RBAC)
- Optional SSO for government users
- Session management & audit logs

### 3.2 Disaster/Incident Management
- Create and classify disaster events (flood, earthquake, cyclone, fire, etc.)
- Severity levels and status tracking (Active / Contained / Resolved)
- Geo-tagged incident reporting (map view)
- Timeline/history of an event

### 3.3 Resource Management
- Inventory of relief resources (food, medical, shelter, vehicles)
- Resource request & allocation workflow
- Real-time availability tracking per region

### 3.4 Team & Task Coordination
- Assign field teams/volunteers to incidents
- Task status updates (Assigned / In Progress / Completed)
- Communication log per task

### 3.5 Public Interaction
- Public incident/help reporting form
- Live alerts & notifications (SMS/Email/Push)
- Shelter locator with capacity status
- Emergency contact directory

### 3.6 Reporting & Analytics
- Dashboard with real-time stats (per region/role)
- Damage & relief reports (exportable PDF/Excel)
- Historical disaster data analytics

### 3.7 Communication
- In-app notifications
- Broadcast alerts (region-based)
- Integration with SMS/WhatsApp gateway (optional)

---

## 4. Suggested Tech Stack

| Layer | Options |
|---|---|
| Frontend | React.js / Next.js |
| Backend | Node.js (Express/NestJS) or Django |
| Database | PostgreSQL (with PostGIS for geo data) |
| Auth | JWT + Role-based middleware |
| Real-time | WebSockets / Socket.io |
| Maps | Leaflet.js / Google Maps API |
| Hosting | AWS / Azure (with auto-scaling for disaster spikes) |
| Notifications | Firebase Cloud Messaging, Twilio (SMS) |

---

## 5. High-Level Architecture

```
[ Public Users ]   [ Field Responders ]   [ Officials/Admins ]
        \                 |                     /
         \                |                    /
          -----------  API Gateway  -----------
                          |
              ------------------------
              |   Auth & RBAC Layer   |
              ------------------------
                          |
        --------------------------------------
        |         Application Services         |
        |  (Incident, Resource, Task, Alerts)  |
        --------------------------------------
                          |
              ------------------------
              |   Database (PostgreSQL)|
              ------------------------
```

---

## 6. Database Entities (Draft)

- **Users** (id, name, role, region, contact, status)
- **Roles** (id, name, permissions)
- **Disasters** (id, type, severity, location, status, created_by)
- **Resources** (id, type, quantity, region, status)
- **Tasks** (id, disaster_id, assigned_to, status, notes)
- **Reports** (id, disaster_id, reported_by, description, location, media)
- **Alerts** (id, region, message, sent_at)

---

## 7. Security & Compliance Considerations
- Data encryption (at rest & in transit)
- Role-based data visibility (e.g., citizens shouldn't see internal resource stock)
- Audit trails for all critical actions
- Backup & disaster recovery plan for the portal itself
- Compliance with local data protection laws (e.g., IT Act, GDPR if applicable)

---

## 8. Next Steps
1. Finalize exact roles & permission matrix
2. Wireframes for each role's dashboard
3. API contract design
4. Database schema finalization
5. MVP scope definition (which modules ship first)

---

*This document is a starting draft — update sections as requirements are refined.*
-e 

---



## 1. Purpose
A single login entry point for the portal that authenticates users and routes them to the correct dashboard based on their role.

---

## 2. Supported Roles (at login)

| Role | Redirects to |
|---|---|
| Super Admin | Admin Dashboard |
| District/State Admin | Regional Dashboard |
| Government Official | Official Dashboard |
| Field Responder / Rescue Team | Field Dashboard |
| Volunteer | Volunteer Dashboard |
| NGO/Partner Organization | Partner Dashboard |
| Public/Citizen | Public Portal |

---

## 3. Login Methods
- **Email + Password**
- **Phone Number + OTP** (recommended for citizens/volunteers who may not have email)
- Optional: **Government SSO** for official users (later phase)

---

## 4. Login Flow
> **Note:** All roles use the same login page/URL (e.g., `/login`). The system determines the user's role after authentication and redirects accordingly — there are no separate role-specific login pages.


```
1. User opens Login page
2. Selects login method (Email/Password OR Phone/OTP)
3. Enters credentials
4. System validates credentials
5. System fetches user's assigned Role
6. Redirects to role-specific dashboard
7. Session/token created (JWT)
```

---

## 5. Screen Requirements

### Login Page
- Input: Email or Phone
- Input: Password (or "Send OTP" button)
- "Forgot Password?" link
- "Login" button
- Error messages (invalid credentials, account locked, etc.)

### OTP Screen (if phone login)
- 6-digit OTP input
- Resend OTP (with cooldown timer, e.g., 30s)
- Auto-expire OTP after 5 minutes

### Forgot Password Flow
- Enter email/phone → send reset link/OTP → set new password

---

## 6. Backend Requirements

### API Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/otp/send` | POST | Send OTP to phone |
| `/api/auth/otp/verify` | POST | Verify OTP & login |
| `/api/auth/forgot-password` | POST | Trigger password reset |
| `/api/auth/reset-password` | POST | Set new password |
| `/api/auth/logout` | POST | Invalidate session/token |
| `/api/auth/me` | GET | Get logged-in user's profile & role |

### Validation Rules
- Password: min 8 chars, at least 1 number & 1 special character
- Phone: valid format check, country code required
- Rate limiting on login attempts (e.g., lock after 5 failed attempts for 15 min)
- OTP: 6-digit numeric, single-use, 5-min expiry

### Token/Session
- JWT access token (short-lived, e.g., 1 hour)
- Refresh token (longer-lived, e.g., 7 days), stored securely (HttpOnly cookie)
- Token payload includes: `user_id`, `role`, `region` (if applicable)

---

## 7. Database Table (Users — login-relevant fields)

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | |
| email | String | Unique, nullable if phone-only |
| phone | String | Unique, nullable if email-only |
| password_hash | String | Nullable if OTP-only login |
| role | Enum/FK | References Roles table |
| region | String/FK | For region-scoped roles |
| status | Enum | Active / Suspended / Pending Approval |
| last_login | Timestamp | |
| created_at | Timestamp | |

---

## 8. Security Considerations
- Passwords hashed with bcrypt/argon2 (never stored plain)
- HTTPS enforced everywhere
- Rate limiting + CAPTCHA on repeated failed logins
- Audit log: record every login attempt (success/failure) with timestamp & IP
- Account lockout / admin approval flow for new Field Responder, Volunteer, NGO signups (to prevent fake accounts accessing disaster data)

---

## 9. Open Questions (to finalize before building)
1. ~~Should Public/Citizen users be allowed to browse without login~~ → **Decided: Yes. Public/Citizen users can browse public content (alerts, shelter locator, emergency contacts, general disaster info) without logging in. Login is required only to submit a report/help request, track submitted reports, or receive personalized notifications.**
2. ~~Should new roles (Volunteer, NGO, Field Responder) self-register, or be added only by an Admin?~~ → **Decided: Both. Users can self-register (Volunteer, NGO, Field Responder), and Admins can also add users directly. Self-registered accounts should go through a `Pending Approval` status until an Admin verifies and activates them (see `status` field in Users table), to prevent fake accounts accessing disaster data.**
3. ~~Is Government SSO needed in MVP, or can it be phase 2?~~ → **Decided: Phase 2. MVP will use Email/Password and Phone/OTP only; Government SSO to be added later.**
4. ~~Single login page for all roles, or separate login URLs~~ → **Decided: Single shared login page/URL (e.g., `/login`) for all roles. Role is detected after authentication and used to redirect to the correct dashboard.**

---

*Next: once confirmed, we can move to wireframes or start backend API implementation for this module.*
-e 

---



## 1. Purpose
Allow Admins to create events (e.g., training workshops, awareness camps, equipment repair drives) that are visible to the public. Public users can view event details and submit a custom registration/response form defined by the Admin for that specific event.

---

## 2. User Actions by Role

| Role | Can do |
|---|---|
| **Admin** | Create/edit/delete events, define custom form fields per event, view/export responses |
| **Public/Citizen** | View listed events, open event details, submit the event's form |

---

## 3. Feature Breakdown

### 3.1 Event Creation (Admin)
Admin creates an event with:

| Field | Type | Notes |
|---|---|---|
| Event Name | Text | e.g., "Electrical Equipment Repair Workshop" |
| Poster/Banner Image | Image upload | Shown on public listing & detail page |
| Description | Rich text/Textarea | Optional details about the event |
| Location | Text / Map pin | Venue address, optionally geo-tagged |
| Start Date | Date | |
| End Date | Date | Supports single-day or multi-day (date range) |
| Time | Time / Time range | e.g., 10:00 AM – 4:00 PM |
| Status | Enum | Draft / Published / Closed / Cancelled |
| Registration Deadline | Date (optional) | Last date to submit the form |
| Max Participants | Number (optional) | Cap on responses, if limited seats |

### 3.2 Custom Form Builder (Admin, per event)
Inside each event, Admin can build a custom form by adding fields dynamically:

| Field Type | Example use |
|---|---|
| Text | Name, Occupation |
| Number | Age, Phone |
| Email | Contact email |
| Dropdown/Select | e.g., "Experience level: Beginner/Intermediate/Advanced" |
| Radio buttons | e.g., "Do you have your own tools? Yes/No" |
| Checkbox (multi-select) | e.g., "Which sessions will you attend?" |
| Date | e.g., "Preferred visit date" if multi-day |
| File upload | e.g., ID proof, photo |
| Textarea | Additional comments |

Each field has:
- Label
- Field type
- Required / Optional toggle
- Options (for dropdown/radio/checkbox)
- Order/position in the form

> Form structure is stored per-event, so different events can have completely different forms.

### 3.3 Public Event Listing
- Grid/List view of all **Published** events
- Each card shows: Poster, Name, Location, Date range
- Filter/sort by: Upcoming, Past, Location, Date
- Search by event name

### 3.4 Public Event Detail Page
- Full poster, description, location (map), date range, time
- "Register / Submit Form" button (disabled if deadline passed or seats full)
- Displays the custom form built by Admin
- Confirmation message/screen after submission, plus automated email/SMS confirmation sent to the address/number provided in the form

### 3.5 Response Management (Admin)
- List of all responses per event (table view)
- Columns = the custom fields defined for that event
- View individual response detail
- Export responses (CSV/Excel)
- Search/filter responses (e.g., by name, date submitted)
- Response count vs. Max Participants indicator

---

## 4. Suggested Data Model

### Events
| Field | Type |
|---|---|
| id | UUID |
| name | String |
| poster_url | String |
| description | Text |
| location | String |
| latitude/longitude | Float (optional) |
| start_date | Date |
| end_date | Date |
| start_time | Time |
| end_time | Time |
| status | Enum (Draft/Published/Closed/Cancelled) |
| registration_deadline | Date (nullable) |
| max_participants | Integer (nullable) |
| created_by | FK → Users |
| created_at | Timestamp |

### Event_Form_Fields
| Field | Type |
|---|---|
| id | UUID |
| event_id | FK → Events |
| label | String |
| field_type | Enum (text/number/email/dropdown/radio/checkbox/date/file/textarea) |
| options | JSON (for dropdown/radio/checkbox) |
| is_required | Boolean |
| order | Integer |

### Event_Responses
| Field | Type |
|---|---|
| id | UUID |
| event_id | FK → Events |
| submitted_by | FK → Users (nullable, if public login not mandatory) |
| submitted_at | Timestamp |

### Event_Response_Values
| Field | Type |
|---|---|
| id | UUID |
| response_id | FK → Event_Responses |
| field_id | FK → Event_Form_Fields |
| value | Text/JSON |

> This key-value structure (Response → Response_Values) allows fully dynamic forms without changing the database schema every time an Admin adds a new field.

---

## 5. API Endpoints (Draft)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/events` | POST | Create event (Admin) |
| `/api/events` | GET | List published events (Public) |
| `/api/events/:id` | GET | Event detail |
| `/api/events/:id` | PUT | Edit event (Admin) |
| `/api/events/:id` | DELETE | Delete/cancel event (Admin) |
| `/api/events/:id/fields` | POST | Add form field (Admin) |
| `/api/events/:id/fields` | GET | Get form structure |
| `/api/events/:id/fields/:fieldId` | PUT/DELETE | Edit/remove field (Admin) |
| `/api/events/:id/responses` | POST | Submit form (Public) |
| `/api/events/:id/responses` | GET | List responses (Admin) |
| `/api/events/:id/responses/export` | GET | Export as CSV (Admin) |
| `/api/events/:id/clone` | POST | Clone event + form structure (Admin) |

---

## 6. Open Questions
1. ~~Does the public user need to be logged in to submit the event form~~ → **Decided: No login required. Form captures name/phone/email etc. directly as form fields; submission is anonymous/guest.**
2. ~~Should there be a duplicate-submission check~~ → **Decided: No duplicate check needed. Multiple submissions from the same phone/email are allowed.**
3. ~~Should Admin be able to clone an event~~ → **Decided: Yes. Admin can clone an existing event (including its custom form structure) to quickly create a new one.**
4. ~~Do we need email/SMS confirmation~~ → **Decided: Yes. Send confirmation via email/SMS after successful form submission.**
5. Should there be **multiple Admins per event** (e.g., a District Admin creating events only for their own region)?

---

*Next: once confirmed, we can move to wireframes for the event listing/detail/form-builder screens, or start API implementation.*
