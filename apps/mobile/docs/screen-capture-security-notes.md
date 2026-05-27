# Screen-capture Security Notes — Mobile

เอกสารสำหรับ engineer ที่ดูแล `apps/mobile` — อธิบายว่า `expo-screen-capture` ทำอะไรได้ / ไม่ได้บ้าง และ defense-in-depth ที่ใช้คู่กัน

**Status**: Phase B (Expo Go-compatible). ยังไม่มี DRM — ยังเป็น "deterrent + watermark + short-lived token" model

---

## Scope

- `expo-screen-capture` ทำงานในระดับ **OS-level "do not capture" flag**:
  - **Android**: `FLAG_SECURE` ใน `Window`
  - **iOS**: screenshot event listener + app-switcher blur (`enableAppSwitcherProtectionAsync`)
- Implementation: `apps/mobile/src/hooks/useSecureScreen.ts`
- ใช้เฉพาะใน `apps/mobile/src/app/lessons/[lessonId].tsx` ผ่าน `ProtectedVideoPlayer` (`apps/mobile/src/components/protected-video-player.tsx`)
- เปิด/ปิดผูกกับ `useFocusEffect` — เปิดเฉพาะเมื่อ user อยู่ในหน้า lesson เท่านั้น คืนค่าให้ allow ทันทีเมื่อ blur

---

## Platform behavior matrix

| Platform | Screenshot | Screen recording | App switcher preview |
|---|---|---|---|
| **Android** (FLAG_SECURE) | Blocked → ภาพดำ | Blocked → ภาพดำ | Blurred / placeholder |
| **iOS** | **NOT blocked** — แต่ event fires → in-app warning + watermark | Reduced (เนื้อหาบางส่วนถูก blank ในระบบ) | Blurred via `enableAppSwitcherProtectionAsync` |
| **Expo Web** | No-op (Platform.OS check) | No-op | n/a |

> Web มี friction layer แยก (`useWebPrivacyDeterrents` ใน `protected-video-player.tsx`) — blur on focus loss, beforeprint, keydown shortcuts — แต่ถือเป็น **deterrent** ไม่ใช่ security

---

## What this is NOT

- **NOT DRM** — ไม่มี encrypted media, ไม่มี per-device key, ไม่มี license server
- **NOT protection against**:
  - กล้องภายนอก / มือถืออีกเครื่องถ่ายจอ
  - HDMI capture / external monitor recording (vendor-dependent)
  - Rooted / jailbroken devices
  - User เปิด custom build ของ Expo Go หรือ patched OS
  - Video downloaders ที่ดักจับ traffic ภายนอก app (token จะหมดอายุก่อน แต่ในระหว่างที่ valid → ดูดได้)
- **iOS ป้องกัน screenshot จริง ๆ ไม่ได้** — emit event อย่างเดียว เราใช้ event เพื่อแสดง warning toast แต่ user ได้รูป screenshot ของวิดีโอจริงอยู่ดี (watermark ติดอยู่ในภาพ — เป็นการ trace ไม่ใช่ prevent)

ห้ามอ้างว่าเป็น "100% screenshot/screen-recording prevention" ในเอกสาร marketing หรือ release note

---

## Defense in depth (มีอยู่จริงใน codebase นี้)

1. **Short-lived signed playback tokens (~120s)** — server เซ็น HMAC ด้วย `PLAYBACK_SECRET`, recheck enrollment ทุก byte ที่ stream
   - `src/app/api/playback/stream/[token]/route.ts`
   - `src/lib/playback-session.ts`
2. **Dynamic watermark** — userId + email + lessonId + timestamp ทับวิดีโอตลอดเวลา
   - `apps/mobile/src/components/protected-video-player.tsx` (lines ~360, 380-385)
3. **Heartbeat session model** — client ส่ง heartbeat ทุก 30s → server สามารถ force-end session ได้ทันที
   - `apps/mobile/src/components/protected-video-player.tsx` (lines ~342-358)
4. **ไม่มี raw `storageKey` / `sourceUrl` ออก client** — public API ส่งเฉพาะ signed `playbackUrl` เท่านั้น
5. **Banner เตือนผู้ใช้** — `ProtectedContentNotice` แสดงข้อความบอก user ก่อนเริ่มดู → trust + deterrent + กฎหมายลิขสิทธิ์เป็น backstop

---

## Future hardening (ถ้าจำเป็นในอนาคต)

- ย้ายไป **CDN with signed URLs + IP/region restrictions** (CloudFront / BunnyCDN signed URL)
- เพิ่ม **HLS/DASH + Widevine (Android) / FairPlay (iOS)** DRM
  - ต้องการ **custom EAS build** — Expo Go run ไม่ได้
  - ต้อง license server + per-device key
- **Server-side anomaly detection**:
  - หลาย session ที่ lesson เดียวกัน user เดียวกัน IP ต่างกัน → flag/ban
  - playback ที่ duration < N% แต่ token ถูก refresh เกินจำนวน expected → flag
- **Forensic watermarking** — embed user id ลง video stream แบบ steganography (ต้อง re-encode per request)

---

## File map

| Role | Path |
|---|---|
| Hook (เปิด/ปิด FLAG_SECURE + listener) | `apps/mobile/src/hooks/useSecureScreen.ts` |
| Banner เตือน user | `apps/mobile/src/components/ProtectedContentNotice.tsx` |
| Video player + watermark + heartbeat | `apps/mobile/src/components/protected-video-player.tsx` |
| Screen ที่เรียก hook | `apps/mobile/src/app/lessons/[lessonId].tsx` |
| Server playback token + stream | `src/app/api/playback/stream/[token]/route.ts` |
| Session lifecycle (server) | `src/lib/playback-session.ts` |

---

## Honest summary

Web-based / Expo Go-based playback ที่ **ไม่มี DRM** → **ไม่สามารถ guarantee zero screen capture ได้** ระบบนี้รวมหลายชั้น (FLAG_SECURE + iOS event + watermark + short-lived token + heartbeat) เพื่อ **เพิ่มต้นทุน + เพิ่มความเสี่ยงในการถูกตามตัว** สำหรับผู้ที่จะลักเนื้อหา — ไม่ใช่เพื่อ block 100%
