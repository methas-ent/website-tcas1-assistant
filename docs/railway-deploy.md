# Railway deployment — production PostgreSQL

The app now uses **PostgreSQL for both dev and production** (single Prisma provider).
This guide is the exact sequence to deploy on Railway and verify the core flows.

## 1. Provision

1. Create a new Railway project from this GitHub repo.
2. Add the **PostgreSQL** plugin to the project (Railway-managed Postgres).
3. On the web service, Railway auto-detects `railway.json`:
   - build: `npm run build` (Nixpacks runs `npm ci` → `postinstall` → `prisma generate`)
   - start: `npm run start:railway` (= `prisma migrate deploy && next start`)

> Migrations run automatically on every deploy via `start:railway`. No manual
> `migrate deploy` step is needed — but you can run it from the Railway shell too.

## 2. Service variables (set in Railway → service → Variables)

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` | Reference the Postgres plugin, do not hardcode |
| `NODE_ENV` | `production` | |
| `AUTH_SESSION_SECRET` | long random string | session signing |
| `PLAYBACK_SECRET` | long random string | HMAC for playback tokens |
| `PLAYBACK_TOKEN_TTL_SECONDS` | `120` | optional |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | your admin seed | used by `db:seed` |
| `DEMO_STUDENT_EMAIL` / `DEMO_STUDENT_PASSWORD` / `DEMO_STUDENT_NAME` | optional | QA student |
| `DEMO_USER_KEY` | `demo-user` | optional |
| `VIDEO_STORAGE_PROVIDER` | `LOCAL` or `BUNNY` | LOCAL until cloud storage phase |
| `BUNNY_STREAM_*` | — | only if `VIDEO_STORAGE_PROVIDER=BUNNY` |
| Upload dirs (`LOCAL_*_STORAGE_DIR`) | defaults OK | note: container FS is ephemeral — see Risks |

Generate secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 3. Seed QA data (one-time, optional)

Migrations create the empty schema. To load the idempotent QA catalog + admin:

```bash
# Railway shell (or locally with DATABASE_URL pointed at the Railway DB)
npm run db:seed
```

`prisma/seed.ts` is idempotent (upserts), so re-running never duplicates rows.

## 4. Verify core flows on the deployed domain

Run these against the Railway URL after deploy + seed. Each maps to an MVP flow:

1. **Admin login** — `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → reaches `/admin`.
2. **Create/edit course** — `/admin/videos` studio wizard → course appears in list.
3. **Create package** — studio wizard package path → package appears.
4. **Student register/login** — `/register` then `/login` as a student.
5. **Checkout with slip** — add course/package to cart → `/checkout` → upload payment slip → order created as `PENDING_REVIEW`.
6. **Admin mark order paid** — `/admin/orders` → mark the order `PAID`.
7. **Enrollment created** — server creates `Enrollment` on PAID; confirm the student now has access.
8. **My Courses** — student `/my-courses` shows the enrolled course.

## Local development (Postgres)

```bash
docker compose up -d                 # local Postgres on :5432
cp .env.example .env                 # DATABASE_URL already points at local Postgres
npm run db:migrate                   # apply migrations
npm run db:seed                      # load QA data
npm run dev                          # http://localhost:3001
```

## Risks / follow-ups

- **Ephemeral container filesystem**: `LOCAL_*_STORAGE_DIR` (videos, payment slips,
  cover images) are written to the container disk and are **lost on redeploy/restart**.
  Move these to object storage before relying on them in production — videos are
  covered by the Cloudflare R2 + ffmpeg phase (see `docs/video-r2-ffmpeg-plan.md`);
  payment slips + covers still need an R2/S3 target.
- **Connection pooling**: a single long-running Railway instance with the Prisma
  singleton is fine. If you scale to multiple replicas, add a pooler (pgBouncer)
  and a pooled `DATABASE_URL`.
- **No automated e2e**: the 8 flows above are verified manually for now.
