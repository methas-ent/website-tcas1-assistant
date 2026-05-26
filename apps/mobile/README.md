# Knowledge Academy Mobile

Phase Mobile-1 is a student learning app only. The existing Next.js web/admin app stays the backend, storefront, checkout, admin, and content management surface.

## Run Locally

1. Start the web/backend from the repository root:

```bash
npm run dev
```

2. Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Use `http://<your-lan-ip>:3001` for a physical phone.

3. Start Expo:

```bash
npm run mobile:start
```

## Implemented Student Flow

- Student login through `/api/mobile/auth/login`.
- Secure session token storage with Expo SecureStore.
- My Courses screen from `/api/mobile/courses`.
- Course detail with chapters and lessons from `/api/mobile/courses/[courseId]`.
- Lesson player shell from `/api/mobile/lessons/[lessonId]`.
- Playback authorization through the existing `/api/playback/authorize` endpoint.
- Video requests use the protected playback route and pass the bearer session token in request headers.
- Lesson progress sync through `/api/mobile/progress`.

## Security Notes

- The app does not access Prisma or local video storage directly.
- The app never renders raw uploaded video paths.
- Playback still depends on server-side enrollment checks and short-lived signed playback tokens.
- The lesson player displays a per-user visible watermark with name, email, lesson id, and time.
- Expo screen capture prevention is enabled on lesson playback screens.
- Screen capture and screen recording cannot be blocked 100% on every platform, OS version, external camera, emulator, rooted/jailbroken device, or mirrored display.
- Android support uses Expo ScreenCapture/FLAG_SECURE behavior where supported.
- iOS support uses Expo ScreenCapture prevention/detection behavior where supported; limitations vary by iOS version.

## App Store And Payment Policy Warning

This phase does not add in-app purchases or a payment gateway. Paid course purchase and manual payment review remain on the web app. Before publishing to app stores, review Apple and Google policy for digital content purchases, account creation, and external checkout links.

## Verification Targets

- `npm run mobile:typecheck`
- `npm run mobile:lint`
- `npm run mobile:start`
- Web regressions from root: `npm run typecheck`, `npm run lint`, `npm run build`
