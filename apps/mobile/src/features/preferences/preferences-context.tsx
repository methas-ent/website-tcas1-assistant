import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";

type Language = "th" | "en";
type ThemeMode = "light" | "dark";

type Preferences = {
  language: Language;
  themeMode: ThemeMode;
  setLanguage: (language: Language) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  toggleThemeMode: () => Promise<void>;
  t: (key: TranslationKey) => string;
};

type StoredPreferences = {
  language?: Language;
  themeMode?: ThemeMode;
};

const STORAGE_KEY = "knowledge.mobile.preferences";

const translations = {
  appEyebrow: {
    th: "Knowledge Academy",
    en: "Knowledge Academy",
  },
  myCourses: {
    th: "คอร์สของฉัน",
    en: "My Courses",
  },
  greetingPrefix: {
    th: "สวัสดี",
    en: "Hi",
  },
  myCoursesHint: {
    th: "เลือกคอร์สที่ลงทะเบียนไว้เพื่อเรียนต่อ",
    en: "Choose an enrolled course and keep learning",
  },
  logout: {
    th: "ออกจากระบบ",
    en: "Logout",
  },
  loadingApp: {
    th: "กำลังเปิดแอป",
    en: "Opening app",
  },
  loadingData: {
    th: "กำลังโหลดข้อมูล",
    en: "Loading data",
  },
  loadFailed: {
    th: "โหลดข้อมูลไม่สำเร็จ",
    en: "Could not load data",
  },
  emptyCoursesTitle: {
    th: "ยังไม่มีคอร์สที่เปิดใช้งาน",
    en: "No active courses yet",
  },
  emptyCoursesDescription: {
    th: "หลังชำระเงินและแอดมินตรวจสอบคำสั่งซื้อแล้ว คอร์สจะปรากฏในหน้านี้",
    en: "After payment review, enrolled courses will appear here",
  },
  continue: {
    th: "เรียนต่อ",
    en: "Continue",
  },
  lessons: {
    th: "บทเรียน",
    en: "Lessons",
  },
  progress: {
    th: "ความคืบหน้า",
    en: "Progress",
  },
  expires: {
    th: "หมดอายุ",
    en: "Expires",
  },
  completed: {
    th: "จบแล้ว",
    en: "Done",
  },
  open: {
    th: "เปิด",
    en: "Open",
  },
  locked: {
    th: "ล็อก",
    en: "Locked",
  },
  back: {
    th: "กลับ",
    en: "Back",
  },
  accessDenied: {
    th: "เข้าเรียนไม่ได้",
    en: "Access denied",
  },
  courseForbidden: {
    th: "คุณยังไม่มีสิทธิ์เรียนคอร์สนี้",
    en: "You are not enrolled in this course",
  },
  noLessonsTitle: {
    th: "ยังไม่มีบทเรียน",
    en: "No lessons yet",
  },
  noLessonsDescription: {
    th: "แอดมินสามารถเพิ่ม chapter/lesson ได้จากเว็บ admin",
    en: "An admin can add chapters and lessons from the web admin",
  },
  learned: {
    th: "เรียนแล้ว",
    en: "Learned",
  },
  loadingCourse: {
    th: "กำลังโหลดคอร์ส",
    en: "Loading course",
  },
  loadingLesson: {
    th: "กำลังเตรียมบทเรียน",
    en: "Preparing lesson",
  },
  lessonForbidden: {
    th: "บัญชีนี้ยังไม่มีสิทธิ์เปิดบทเรียนนี้",
    en: "This account cannot open this lesson",
  },
  lessonOpenFailed: {
    th: "ไม่สามารถเปิดบทเรียนได้",
    en: "Could not open lesson",
  },
  protectedRoute: {
    th: "เล่นผ่าน protected playback route",
    en: "Protected playback route",
  },
  markComplete: {
    th: "ทำเครื่องหมายว่าเรียนจบ",
    en: "Mark as complete",
  },
  completeSaved: {
    th: "บันทึกว่าเรียนจบบทนี้แล้ว",
    en: "Lesson marked complete",
  },
  previousLesson: {
    th: "บทก่อนหน้า",
    en: "Previous",
  },
  nextLesson: {
    th: "บทถัดไป",
    en: "Next",
  },
  chapterLessons: {
    th: "บทเรียนใน Chapter นี้",
    en: "Lessons in this chapter",
  },
  loginTitle: {
    th: "เข้าสู่ระบบนักเรียน",
    en: "Student Login",
  },
  loginDescription: {
    th: "ใช้บัญชีที่ได้รับสิทธิ์เรียนแล้วเพื่อเปิดคอร์สและบทเรียนบนมือถือ",
    en: "Use your enrolled student account to learn on mobile",
  },
  email: {
    th: "อีเมล",
    en: "Email",
  },
  password: {
    th: "รหัสผ่าน",
    en: "Password",
  },
  login: {
    th: "เข้าสู่ระบบ",
    en: "Login",
  },
  loggingIn: {
    th: "กำลังเข้าสู่ระบบ",
    en: "Logging in",
  },
  invalidCredentials: {
    th: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ไม่ใช่นักเรียน",
    en: "Invalid student email or password",
  },
  loginFailed: {
    th: "เข้าสู่ระบบไม่สำเร็จ",
    en: "Login failed",
  },
  checkoutOnWeb: {
    th: "การสมัครและ checkout ยังใช้เว็บเดิมสำหรับ MVP นี้",
    en: "Registration and checkout stay on the web app for this MVP",
  },
  noVideoTitle: {
    th: "ยังไม่มีวิดีโอสำหรับบทนี้",
    en: "No video for this lesson yet",
  },
  noVideoDescription: {
    th: "เมื่อบทเรียนมีวิดีโอ ระบบจะขอ playback token ก่อนเล่นทุกครั้ง",
    en: "When video is available, the app requests a playback token first",
  },
  screenshotWarning: {
    th: "ตรวจพบการจับภาพหน้าจอ ระบบมี watermark ระบุตัวผู้เรียนแล้ว",
    en: "Screenshot detected. This player includes a user watermark",
  },
  privacyShieldTitle: {
    th: "ซ่อนวิดีโอชั่วคราว",
    en: "Video hidden temporarily",
  },
  privacyShieldDescription: {
    th: "ระบบซ่อนหน้าจอเมื่อแอปไม่อยู่หน้าแรกหรือมีคำสั่งพิมพ์ เป็นมาตรการลดความเสี่ยงเท่านั้น ไม่ใช่การป้องกันภาพหน้าจอหรือการอัดหน้าจอทั้งหมด",
    en: "The player hides while the app is inactive or print is requested. This is best-effort deterrence, not complete screenshot or recording prevention",
  },
} satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof translations;

const PreferencesContext = createContext<Preferences | null>(null);

function isLanguage(value: unknown): value is Language {
  return value === "th" || value === "en";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function webStorage() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function readPreferenceValue() {
  const storage = webStorage();

  if (storage) {
    try {
      return storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  if (Platform.OS === "web") {
    return null;
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writePreferenceValue(value: StoredPreferences) {
  const raw = JSON.stringify(value);
  const storage = webStorage();

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, raw);
    } catch {
      // Preferences can safely fall back to in-memory state.
    }
    return;
  }

  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  }
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("th");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const raw = await readPreferenceValue();

      if (!raw || !mounted) {
        return;
      }

      try {
        const stored = JSON.parse(raw) as StoredPreferences;

        if (isLanguage(stored.language)) {
          setLanguageState(stored.language);
        }

        if (isThemeMode(stored.themeMode)) {
          setThemeModeState(stored.themeMode);
        }
      } catch {
        // Ignore corrupt preference state.
      }
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(
    async (next: Partial<StoredPreferences>) => {
      const merged = {
        language,
        themeMode,
        ...next,
      };

      await writePreferenceValue(merged);
    },
    [language, themeMode],
  );

  const setLanguage = useCallback(
    async (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      await persist({ language: nextLanguage });
    },
    [persist],
  );

  const setThemeMode = useCallback(
    async (nextThemeMode: ThemeMode) => {
      setThemeModeState(nextThemeMode);
      await persist({ themeMode: nextThemeMode });
    },
    [persist],
  );

  const toggleLanguage = useCallback(
    () => setLanguage(language === "th" ? "en" : "th"),
    [language, setLanguage],
  );

  const toggleThemeMode = useCallback(
    () => setThemeMode(themeMode === "light" ? "dark" : "light"),
    [setThemeMode, themeMode],
  );

  const value = useMemo<Preferences>(
    () => ({
      language,
      themeMode,
      setLanguage,
      setThemeMode,
      toggleLanguage,
      toggleThemeMode,
      t: (key) => translations[key][language],
    }),
    [language, setLanguage, setThemeMode, themeMode, toggleLanguage, toggleThemeMode],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return context;
}
