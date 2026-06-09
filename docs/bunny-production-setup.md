# Bunny Stream — Production Video Setup

> **Status: NOT ENABLED.** Production currently runs `VIDEO_STORAGE_PROVIDER=LOCAL`
> (dev/testing only). This document is the checklist to switch production video to
> Bunny Stream. The integration code already exists in `main` (PR #1); enabling it
> is configuration + testing only — **no code, schema, or DB changes required**.
>
> Decision of record: LOCAL is dev/testing only and will **not** be made to support
> large production videos. R2 + ffmpeg and Native/EAS are explicitly out of scope.

## Why Bunny
LOCAL on Railway uses the container's **ephemeral disk** (files vanish on every
redeploy) and buffers whole files in memory inside a Server Action (large files
OOM small instances). Bunny Stream provides durable storage, automatic HLS
transcoding, a global CDN, and short-lived signed URLs — without changing the DB.

The app is provider-pluggable: storage provider is chosen per-asset, so LOCAL and
BUNNY assets can coexist and rollback is safe.

---

## A. Create resources in Bunny
1. Bunny.net → **Stream** → create a **Video Library** → note the **Library ID** and **API Key** (Stream library → API).
2. Note the library's **CDN hostname** (form `vz-xxxxxxxx.b-cdn.net`) — this is the pull zone host.
3. Library → **Security** → enable **Token Authentication** → note the **Token Authentication Key**.
4. (Recommended) Generate a webhook shared secret:
   `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

## B. Railway service variables (add / change)
| Variable | Value |
|---|---|
| `VIDEO_STORAGE_PROVIDER` | `BUNNY` (change from `LOCAL`) |
| `BUNNY_STREAM_LIBRARY_ID` | from A1 |
| `BUNNY_STREAM_API_KEY` | from A1 — server-only, never exposed to clients |
| `BUNNY_STREAM_PULLZONE` | `vz-xxxxxxxx.b-cdn.net` from A2 |
| `BUNNY_STREAM_TOKEN_KEY` | from A3 — server-only |
| `BUNNY_STREAM_WEBHOOK_SECRET` | from A4 (recommended) |
| `VIDEO_UPLOAD_MAX_BYTES` | size matched to instance RAM (e.g. `524288000` = 500 MB) |

Notes:
- `LOCAL_VIDEO_MAX_BYTES` has no effect when provider is `BUNNY` (the cap reverts to `VIDEO_UPLOAD_MAX_BYTES`).
- After setting variables, **redeploy/restart** the service so the new env is loaded. **Do not run any DB command.**

## C. Webhook setup (auto-flip PROCESSING → READY)
- Bunny dashboard → Stream library → **Webhook** → set URL:
  `https://<railway-domain>/api/admin/video/bunny-webhook?secret=<BUNNY_STREAM_WEBHOOK_SECRET>`
- The route re-fetches the authoritative status from Bunny (a spoofed callback cannot promote an asset), then flips the `VideoAsset` `PROCESSING → READY` (or `FAILED`).
- Fallback: a lazy poll on `/admin/videos` reconciles any still-`PROCESSING` Bunny assets when the page loads, in case a webhook is missed.

## D. Test plan (after variables + redeploy)
1. **Upload**: admin uploads a medium MP4 (~50–150 MB) → asset shows `PROCESSING` → after Bunny encodes (webhook or open `/admin/videos`) → `READY`. Confirm `storageProvider=BUNNY`, `storageKey=<GUID>`.
2. **Playback (web)**: open `/watch/[lessonId]` → HLS plays on Safari (native) and Chrome (hls.js); dynamic watermark + heartbeat work.
3. **Playback (mobile)**: lesson plays; `playbackKind=hls`.
4. **Token expiry**: wait past the TTL (~120 s), reuse the old signed URL → rejected; re-authorize → plays again.
5. **Security**: inspect `/api/playback/authorize` response — no API key / raw storageKey leaked; opening a Bunny URL without a valid token is blocked.
6. **Large file**: upload one genuinely large file to observe instance memory. If it OOMs, bump Railway RAM or plan client-direct (resumable) upload to Bunny in a later phase — **not** R2/ffmpeg.

## E. Rollback plan
- Set `VIDEO_STORAGE_PROVIDER=LOCAL` and redeploy.
- Existing BUNNY assets keep playing (the playback resolver picks the source per-asset by `storageProvider`), so rollback is non-destructive. No DB change needed.

## Known limitations (after enabling Bunny)
- **Server Action buffering**: the current admin upload path still buffers the whole file in memory on the server before sending to Bunny. Very large files on small Railway instances can still pressure memory. Mitigations: bump RAM, set a sane `VIDEO_UPLOAD_MAX_BYTES`, or (future) client-direct/resumable upload straight to Bunny.
- **Payment slips & cover images still use LOCAL** ephemeral storage — they are unaffected by this change and remain lost on redeploy until moved to object storage (separate follow-up).
- **DRM / offline playback**: not included (would require Native/EAS — out of scope).
- This change does **not** touch the database schema, migrations, or seed.

## Out of scope (explicit)
- Do not make LOCAL support large production videos.
- Do not start R2 + ffmpeg video storage.
- Do not start Native/EAS builds.
