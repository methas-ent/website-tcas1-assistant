# AGENTS.md

## Source Of Truth

This repository is now a **Full LMS MVP**.

It is **not** Sales/Marketing-only. Earlier scope documents, agent briefs, or
implementation notes that describe this project as only a marketing site, or
that forbid LMS/auth/order/enrollment work, are outdated. When instructions
conflict, follow this `AGENTS.md` first.

The product goal is a Thai-first learning platform where students can browse
courses/packages, place checkout orders, receive enrollments after admin
payment approval, and learn from enrolled course lesson lists and a course
player shell. Admins can manage catalog content, packages, orders, and video
metadata/uploads.

## Allowed Scope

The approved MVP scope includes:

- Public storefront
- Course catalog
- Course detail pages
- Cart
- Student register/login
- Checkout that creates an order
- Admin login
- Admin dashboard
- Admin order view and purchase counts
- Admin course management
- Admin package management
- Admin chapter management
- Admin lesson management
- Video upload metadata
- Local/dev video storage adapter
- Student enrolled courses
- Lesson list pages
- Course player shell
- Secure playback planning
- Token-based access control for playback, after access control is ready

## Order And Enrollment Rules

- Do not implement a real online payment gateway in this phase.
- Checkout creates an order with status `PENDING_PAYMENT` or
  `PENDING_REVIEW`.
- Admins can manually mark an order as `PAID`.
- When an order is marked `PAID`, create enrollments for the student.
- Enrollment creation must happen server-side and must be tied to the paid
  order state.

## Out Of Scope For Now

Do not build these unless a later `AGENTS.md` update explicitly allows them:

- Real payment gateway integration
- Production-grade video transcoding
- DRM
- External email/SMS automation
- Advanced analytics
- Multi-school or multi-tenant features
- Native-app-only anti-screen-recording features
- Claims that web playback can fully prevent screenshots or screen recording

## Engineering Rules

- Use `npm` for now because `npm run dev` currently works in this repo.
- Do not switch package managers unless explicitly approved.
- Do not hardcode admin passwords.
- Store passwords only as hashes.
- Protect `/admin` routes.
- Protect `/student` routes.
- Public course/package pages may be visible without login.
- Checkout and enrollment creation must validate server-side data.
- Students must only access enrolled course lessons.
- Admin mutations must be server-side protected.
- Do not expose raw private video URLs in public pages or public APIs.
- Do not commit uploaded video files.
- Add local upload storage paths to `.gitignore` when upload storage is added.
- Keep uploaded local/dev video files outside source-controlled app code.
- Keep secrets in environment variables, not client code.

## Recommended Architecture Boundaries

- Public storefront/catalog: public pages, course/package cards, product
  detail views, cart entry points.
- Student app: auth, enrolled course dashboard, lesson list, course player
  shell, access checks.
- Checkout/orders: cart validation, order creation, pending review/payment
  state, enrollment creation when paid.
- Admin: login, dashboard, order review, purchase counts, catalog/content CRUD,
  package CRUD, video metadata and local upload adapter.
- Playback: plan secure playback and token-based access control after student
  access control and enrollments exist.
- Database: model users, roles, packages, courses, chapters, lessons, videos,
  orders, order items, enrollments, and future playback access/session records.

## Agent Responsibility Map

- `vdo-platform-architect`: maintain scope, phase order, boundaries, and
  handoff plans. Must align future agents with this Full LMS MVP scope.
- `vdo-db-schema`: own Prisma schema, migrations, seed data, relational
  contracts, and data safety.
- `vdo-ui-course-player`: evolve into the student-facing LMS UI owner:
  storefront, catalog, enrolled courses, lesson lists, and player shell.
- `vdo-admin-video-ops`: own admin login, dashboard, order review, catalog
  management, package management, lesson management, video metadata, and local
  upload adapter.
- `vdo-secure-playback`: plan and later implement token-based playback access
  after auth/enrollment checks are in place.
- `vdo-reviewer`: read-only review for scope adherence, route protection,
  secret handling, video URL exposure, checks, and regressions.

Existing `.codex/agents/*.toml` and `.claude/agents/*.md` files may still
contain older milestone constraints. Treat them as lower priority than this
file until they are updated.

## Definition Of Done

For each implementation phase, run what exists and report anything that cannot
be run:

- `npm run typecheck`, if available
- `npm run lint`, if available
- `npm run test`, if available
- `npm run build`
- Manual browser check of the affected route(s)

For browser checks, verify the app renders the intended route, obvious
navigation works, protected routes enforce access rules, and no stale
placeholder page is being shown.
