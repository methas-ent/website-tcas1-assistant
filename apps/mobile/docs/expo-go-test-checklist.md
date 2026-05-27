# Expo Go QA Checklist — Knowledge Academy Mobile

เอกสารนี้ใช้สำหรับทีม QA และนักพัฒนาเพื่อทดสอบ Mobile App ที่รันด้วย **Expo Go** บนเครื่องจริง (iOS / Android) และ Expo Web เป็น fallback

> เน้นทดสอบ smoke test, screen-capture protection, watermark/heartbeat regression และพฤติกรรมแบบ cross-platform
> ใช้คำสั่งภาษาอังกฤษตรง ๆ ในส่วน CLI เพื่อหลีกเลี่ยงปัญหา keyboard layout

---

## A. ติดตั้ง Expo Go

- **iOS**: ดาวน์โหลด [Expo Go จาก App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: ดาวน์โหลด [Expo Go จาก Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

ตรวจสอบเวอร์ชัน Expo Go ให้รองรับ **Expo SDK 56** (ดูจาก `apps/mobile/package.json` → `"expo": "~56.0.4"`)
แต่ถ้าไม่ได้ให้เป็น **Expo SDK 54** 
---

## B. รัน dev server

```bash
cd apps/mobile
npx expo start --clear
```

- รอจน Metro bundler พร้อม แล้วสแกน QR code ด้วย **Expo Go (Android)** หรือกล้อง iOS แล้วเปิดด้วย Expo Go
- ถ้าโทรศัพท์อยู่คนละ network กับเครื่อง dev → ใช้:

```bash
npx expo start --tunnel
```

- ถ้า bundle error ให้ลบ cache:

```bash
npx expo start --clear
# หรือ
rm -rf .expo node_modules/.cache
```

---

## C. Smoke test (5 นาที)

| Step | คาดหวัง |
|---|---|
| เปิด app ครั้งแรก | เห็นหน้า **Login** |
| Login ด้วย admin หรือ student | redirect ไปหน้า **My Courses** |
| เข้าหน้า My Courses | เห็นรายการคอร์สที่ enroll แล้ว |
| กดเลือกคอร์ส | เห็น chapter list + lesson list |
| กดเลือก lesson | เห็น **video player** + banner สีเหลือง `เนื้อหานี้สำหรับผู้ที่ซื้อแล้ว ห้ามบันทึกหรือเผยแพร่ ถ้าพยายามจับภาพหน้าจอ ระบบจะแจ้งเตือน` |
| กดปุ่ม Mark complete | เห็น confirmation message |

ถ้า fail ที่ขั้นใดขั้นหนึ่ง — STOP และรายงาน

---

## D. ทดสอบ Screen-capture protection — Android

| Step | คาดหวัง |
|---|---|
| เปิดหน้าทั่วไป (login, my courses, course detail) → กด screenshot | ได้รูปปกติ |
| เข้าหน้า lesson player → กด screenshot | ได้ผลลัพธ์อย่างใดอย่างหนึ่ง: หน้าจอ **ดำสนิท** (Android FLAG_SECURE), หรือมีแจ้งเตือน "ห้าม screenshot" หรือถูก block ทั้งหมด — ขึ้นกับ ROM/ยี่ห้อ |
| Screen recording ใน lesson player | ภาพในไฟล์อัด **ดำ** หรือถูก block |
| ออกจาก lesson player → กลับหน้า My Courses → กด screenshot | กลับมา **ทำได้ตามปกติ** |
| Multi-task (recent apps button) ขณะอยู่ใน lesson player | preview ใน task switcher ควร **เบลอ/ดำ** |

จำลอง screenshot บน emulator:

```bash
adb shell input keyevent 120
```

จำลอง screen recording บน emulator:

```bash
adb shell screenrecord /sdcard/test.mp4
# Ctrl+C เพื่อหยุด
adb pull /sdcard/test.mp4
```

---

## E. ทดสอบ Screen-capture protection — iOS

> หมายเหตุ: iOS API **ไม่อนุญาต** ให้ block screenshot ตรง ๆ ได้เหมือน Android — ทำได้แค่ emit event และเบลอ app switcher preview

| Step | คาดหวัง |
|---|---|
| เปิดหน้าทั่วไป → กด screenshot (Power + Volume Up) | ได้รูปปกติ |
| เข้า lesson player → กด screenshot | iOS อนุญาตให้ถ่ายได้ — แต่จะ **emit event** และ app แสดง warning toast ทับวิดีโอ |
| เปลี่ยน app (swipe up to App Switcher) ขณะอยู่ใน lesson player | preview ใน switcher ควร **เบลอ/ดำ** |
| Screen recording (Control Center → Screen Recording) | ภาพในไฟล์อัด **ดำ** หรือถูก block |
| ออกจาก lesson player → switcher preview ควรกลับเป็นปกติ | preview เห็นเนื้อหาทั่วไปปกติ |

iOS Simulator:

```text
Device > Trigger Screenshot   (หรือ ⌘+S)
```

---

## F. Web fallback (Expo Web)

```bash
npx expo start --web
```

- เปิด `http://localhost:8081`
- Screen-capture protection จะถูก **skip** (`Platform.OS === "web"`) — UI ต้องไม่ crash
- Video player ใช้ **signed URL** (browser ส่ง Authorization header ใน video element ไม่ได้)
- มี deterrent layer แบบ web เท่านั้น: blur on focus loss, beforeprint warning, keydown shortcut shield (PrintScreen, Cmd+Shift+3/4/5, Ctrl+Shift+S, Cmd/Ctrl+P) — ทั้งหมดถือเป็น **friction** ไม่ใช่ security

---

## G. Regression checks

- หลังออกจาก player แล้วเข้า My Courses → screenshot ทำได้
- หลังเปลี่ยน lesson (Next/Previous) → token + session **ใหม่ทุกครั้ง** (Network tab → `/api/playback/authorize` ถูกเรียกใหม่)
- Heartbeat ส่งทุก **30s** ขณะ player active (ดู Network tab ใน Expo Web หรือ proxy log)
- เมื่อ logout → session ปัจจุบันถูก end (ดู Network: `endPlaybackSession`)
- Watermark แสดง `userName • email • lessonId` และ timestamp ที่ refresh ตามวินาที

---

## H. Known limitations / fail cases (อย่ารายงานเป็น bug)

- **ไม่กัน external camera** — ถ่ายจอด้วยมือถืออีกเครื่อง / กล้อง DSLR
- **ไม่กัน HDMI mirroring** บางรุ่น (Android คาดว่ากันได้ แต่ขึ้นกับ vendor)
- **iOS API จำกัด** — block screenshot จริง ๆ ไม่ได้ — ทำได้แค่ event + app-switcher blur
- **Rooted / Jailbroken devices** อาจ bypass FLAG_SECURE ได้
- **Expo Web** — ไม่มี OS-level protection ใด ๆ ทั้งสิ้น
- **Browser DevTools** บน web → user เปิด console / network tab ดู signed URL ได้ (token หมดอายุเร็ว เป็น mitigation แทน)

---

## รายงาน bug

ส่ง issue พร้อมข้อมูลต่อไปนี้:

- รุ่นเครื่อง + OS version
- Expo Go version
- Screenshot/screen-record ของอาการ (ถ้าทำได้)
- ขั้นตอน reproduce
- Console log จาก `npx expo start` (ถ้ามี)
