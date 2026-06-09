# Next phase plan — Cloudflare R2 + ffmpeg HLS video storage

> Status: **PLAN ONLY**. Do not start until the production PostgreSQL deploy on
> Railway is stable and the 8 core flows are verified (see `docs/railway-deploy.md`).
> This is the self-hosted alternative to Bunny Stream — it reuses the same
> provider abstraction already in the codebase, so it slots in without touching
> the playback routes or the player UI.

## Why this fits cleanly
The cloud-streaming work already added a provider-pluggable seam:
- `StorageProviderName` in [src/lib/video-storage.ts](src/lib/video-storage.ts) (`LOCAL | BUNNY | S3 | R2 | CLOUD`)
- `resolvePlaybackSource()` in [src/lib/video/playback-source.ts](src/lib/video/playback-source.ts) — returns `{ playbackUrl, playbackKind, expiresAt }`
- Players already speak HLS (web hls.js / native), authorize/token routes already pass `playbackKind`.

Adding R2 means implementing **one storage provider + one transcode step + one
signed-URL resolver branch** — the rest is untouched.

## Architecture
```
Admin upload ──▶ store ORIGINAL in R2 (raw/) ──▶ ffmpeg transcode ──▶ HLS ladder
                                                          │
                                                          ▼
                                        upload {master.m3u8, renditions, .ts} to R2 (hls/{assetId}/)
                                                          │
                                                          ▼
   student authorize ──▶ resolvePlaybackSource (R2 branch) ──▶ signed HLS URL
                                                          │
                                                          ▼
        Cloudflare Worker in front of R2 validates HMAC token for /{assetId}/ prefix ──▶ serves segments
```

### Components to build
1. **R2 client + storage provider** (`src/lib/video/r2.ts`, extend `video-storage.ts`)
   - Use S3-compatible SDK (`@aws-sdk/client-s3`) pointed at the R2 endpoint.
   - `R2VideoStorageProvider.saveVideo()`: PUT original to `raw/{assetId}`, create the
     `VideoAsset` as `PROCESSING`, enqueue a transcode job. `storageKey = assetId` (prefix).
   - Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
     `R2_PUBLIC_HOST` (the Cloudflare Worker / custom domain), `R2_SIGNING_KEY`.

2. **ffmpeg transcode pipeline** (`src/lib/video/transcode.ts` + a worker)
   - HLS ladder (start small): 360p / 720p (+1080p if source allows), 6s segments,
     `-hls_playlist_type vod`, master `master.m3u8`.
   - Run in a **separate Railway worker service** (not the web request) so encoding
     never blocks HTTP. MVP-acceptable fallback: a detached job + DB-polled status.
   - On finish: upload `hls/{assetId}/**` to R2, set `VideoAsset.status = READY`
     (reuse the existing PROCESSING→READY model and the admin lazy-poll pattern from
     [src/lib/video/bunny-sync.ts](src/lib/video/bunny-sync.ts)).
   - Install ffmpeg on Railway via `nixpacks.toml` (`nixPkgs = ["ffmpeg"]`).

3. **Signed delivery** (`resolvePlaybackSource` R2 branch + Cloudflare Worker)
   - Add `storageProvider === "R2"` branch returning
     `https://{R2_PUBLIC_HOST}/{assetId}/master.m3u8?token=...&expires=...`
     using a **directory/prefix token** (same idea as the Bunny `token_path` signer
     in [src/lib/video/bunny.ts](src/lib/video/bunny.ts) — one token authorizes the
     whole `/{assetId}/` prefix so every segment is covered).
   - A **Cloudflare Worker** in front of the R2 bucket validates the HMAC token +
     expiry for the requested prefix before serving the object. Keeps R2 private and
     the secret server-side. (Worker code lives outside this repo / in `infra/`.)
   - `playbackKind: "hls"`, `mimeType: "application/vnd.apple.mpegurl"` — players need
     no change.

4. **Job/status model**
   - Reuse `VideoAsset.status` (PROCESSING/READY/FAILED). Optionally add a small
     `TranscodeJob` table (assetId, state, attempts, error) if retries are needed.

## Migration / DB impact
- Likely **none to the schema** for MVP: `storageProvider="R2"`, `storageKey=assetId`
  fit existing columns. Add a `TranscodeJob` model only if you want durable retries —
  that would be one additive Postgres migration (`prisma migrate dev`).

## Trade-offs vs Bunny Stream (already implemented)
- ✅ R2 egress is free behind Cloudflare; full control of pipeline + storage.
- ⚠️ You own the ffmpeg worker, the HLS ladder, and the Cloudflare Worker auth — more
  ops than Bunny's managed transcode. DRM is not included (would need a license server).
- Both can coexist: provider is per-asset, so you can migrate gradually.

## Verification (when built)
- Upload via admin → asset PROCESSING → worker transcodes → READY.
- `authorize` for an R2 asset returns a signed `master.m3u8` URL, `playbackKind: "hls"`.
- Web (Safari native + Chrome hls.js) and mobile play it; token expiry blocks replay.
- Direct R2 object access without a valid token is rejected by the Worker.
- No raw `storageKey` / R2 keys / signing key leak to the client.

## Concrete next step (do this first, before any R2 code)
**Finish and stabilize the Railway PostgreSQL deploy** per `docs/railway-deploy.md`:
deploy → confirm `prisma migrate deploy` ran → `npm run db:seed` → verify all 8 core
flows on the live domain. Only after that is green, start component #1 (R2 client +
provider) on a feature branch.
