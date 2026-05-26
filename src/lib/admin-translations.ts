export type AdminLanguage = "th" | "en";
export type AdminTheme = "light" | "dark";

export const ADMIN_LANGUAGE_STORAGE_KEY = "vdo-admin-language";
export const ADMIN_THEME_STORAGE_KEY = "vdo-admin-theme";
export const ADMIN_PREFERENCES_EVENT = "vdo-admin-preferences-change";

const adminTranslations: Record<string, string> = {
  "ข้ามไปยังเนื้อหา": "Skip to content",
  "ผู้ดูแลระบบ": "Admin",
  "หน้าแรก": "Home",
  "คอร์ส/แพ็กเกจ": "Courses / Packages",
  "เข้าเรียน": "Learn",
  "ตะกร้า": "Cart",
  "คอร์สของฉัน": "My Courses",
  "เลือกคอร์ส": "Browse Courses",
  "พื้นที่นักเรียน": "Student Area",
  "แอดมิน": "Admin",
  "แดชบอร์ด": "Dashboard",
  "ออเดอร์": "Orders",
  "คำสั่งซื้อ": "Orders",
  "รายละเอียดคำสั่งซื้อ": "Order Detail",
  "คอร์ส": "Courses",
  "แพ็กเกจ": "Packages",
  "แพ็กเกจ/คอร์ส": "Packages / Courses",
  "จัดการแพ็กเกจ/คอร์ส": "Manage Packages / Courses",
  "วิดีโอ": "Videos",
  "สร้างคอร์ส": "New Course",
  "แก้ไขคอร์ส": "Edit Course",
  "สร้างแพ็กเกจ": "New Package",
  "แก้ไขแพ็กเกจ": "Edit Package",
  "อัปโหลดวิดีโอ": "Upload Video",
  "คำสั่งซื้อทั้งหมด": "Total Orders",
  "รวมทุกสถานะ": "All statuses",
  "ชำระแล้ว": "Paid",
  "เปิดสิทธิ์แล้ว": "Enrollment granted",
  "รอตรวจสลิป": "Slip Review",
  "มีหลักฐานโอน": "Payment proof attached",
  "รอดำเนินการ": "Pending",
  "ยังไม่ชำระ/รอตรวจ": "Unpaid or waiting review",
  "นักเรียน": "Students",
  "บัญชี STUDENT": "Student accounts",
  "คอร์สทั้งหมด": "Courses",
  "รวม Draft/Ready": "Draft and Ready",
  "แพ็กเกจทั้งหมด": "Packages",
  "ชุดขายทั้งหมด": "All sellable bundles",
  "แพ็กเกจที่ขายแล้ว": "Sold Packages",
  "จากออเดอร์ PAID": "From paid orders",
  "คอร์สที่เปิดสิทธิ์": "Enrolled Courses",
  "คอร์สที่มี enrollment": "Courses with enrollments",
  "รายการล่าสุด": "Latest",
  "คำสั่งซื้อล่าสุด": "Recent Orders",
  "ดูคำสั่งซื้อทั้งหมด": "View All Orders",
  "ยังไม่มีคำสั่งซื้อ": "No orders yet",
  "ออกจากระบบ": "Sign out",
};

export function translateAdminText(text: string) {
  return adminTranslations[text] ?? text;
}
