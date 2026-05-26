# Phase Mobile-1 Architecture

## Decision

Use an incremental monorepo shape without moving the existing Next.js app:

- Existing web/admin/backend remains at the repository root.
- New Expo student app lives in `apps/mobile`.
- Shared DTOs and theme tokens live in `packages/shared`.
- Mobile API wrapper lives in `packages/api-client`.

Moving the current Next.js app into `apps/web` is intentionally deferred. The root web app already passes build/type/lint checks and contains the production-critical admin/order/enrollment/video flows, so moving it during Mobile-1 would add risk without improving the native MVP.

## Backend Reused

- Auth/session table and password hashing.
- Enrollment-based student access checks.
- Course/chapter/lesson query helpers.
- Existing secure playback authorization and stream routes.
- Existing `LessonProgress` and `CourseProgress` models.

## Backend Added For Mobile

- `/api/mobile/auth/login`
- `/api/mobile/auth/me`
- `/api/mobile/auth/logout`
- `/api/mobile/courses`
- `/api/mobile/courses/[courseId]`
- `/api/mobile/lessons/[lessonId]`
- `/api/mobile/progress`

These routes accept a bearer session token and return mobile-friendly JSON. They do not expose database internals or raw private video paths.

## Native App Screens

- Login
- My Courses
- Course Detail
- Lesson Player

The native app intentionally excludes checkout, admin, payment review, package management, DRM, CDN/S3/R2, transcoding, analytics, certificate features, and mobile admin.

## Security Posture

Mobile playback uses layered protection:

- Student auth required.
- Active enrollment required.
- Playback token is short-lived and bound server-side to user, session, and lesson.
- Stream endpoint also requires the mobile bearer session token.
- Raw storage keys and upload paths are not shown to the mobile client.
- Per-user watermark is visible over the video surface.
- Expo screen capture APIs are used on the lesson screen where supported.

This is practical protection for MVP. It is not DRM and cannot guarantee screenshot/screen-recording prevention in every environment.

## Remaining Production Risks

- Native release builds still need device testing on real Android/iOS hardware.
- App store review may require policy decisions around paid digital learning content.
- Video streaming remains local/dev storage, not CDN-backed.
- Playback token/session telemetry is console-based, not a durable suspicious-access event table.
- Offline playback is intentionally not supported.
