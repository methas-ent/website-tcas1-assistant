import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { loginAdminAction } from "@/lib/auth-actions";

type AdminLoginPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

const errorMessages: Record<string, string> = {
  forbidden: "บัญชีนี้ไม่มีสิทธิ์เข้าพื้นที่ผู้ดูแล",
  invalid: "อีเมลหรือรหัสผ่านผู้ดูแลไม่ถูกต้อง",
  required: "กรุณาเข้าสู่ระบบผู้ดูแลก่อน",
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const user = await getCurrentUser();
  const next = searchParams?.next ?? "/admin";

  if (isAdmin(user)) {
    redirect(next.startsWith("/admin") ? next : "/admin");
  }

  const error = searchParams?.error
    ? errorMessages[searchParams.error] ?? "เข้าสู่ระบบไม่สำเร็จ"
    : null;

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-160px)] max-w-md place-items-center px-page py-10">
        <Card className="w-full">
          <p className="text-sm font-bold text-primary-700">Admin Login</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink">
            เข้าสู่ระบบผู้ดูแล
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            ใช้บัญชี ADMIN ที่ seed จาก environment variables เท่านั้น
          </p>
          <form action={loginAdminAction} className="mt-6 grid gap-4">
            <input name="next" type="hidden" value={next} />
            <Input
              autoComplete="email"
              label="อีเมลผู้ดูแล"
              name="email"
              required
              type="email"
            />
            <Input
              autoComplete="current-password"
              label="รหัสผ่าน"
              name="password"
              required
              type="password"
            />
            {error ? (
              <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit">เข้าสู่ระบบผู้ดูแล</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-muted">
            กลับไป{" "}
            <Link className="font-bold text-primary-700" href="/">
              หน้า storefront
            </Link>
          </p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
