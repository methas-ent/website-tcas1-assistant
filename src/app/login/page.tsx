import Link from "next/link";
import { loginStudentAction } from "@/lib/auth-actions";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

const errorMessages: Record<string, string> = {
  invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const next = searchParams?.next ?? "/checkout";
  const error = searchParams?.error
    ? errorMessages[searchParams.error] ?? "เข้าสู่ระบบไม่สำเร็จ"
    : null;

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-160px)] max-w-md place-items-center px-page py-10">
        <Card className="w-full">
          <p className="text-sm font-bold text-primary-700">Student Login</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink">
            เข้าสู่ระบบนักเรียน
          </h1>
          <form action={loginStudentAction} className="mt-6 grid gap-4">
            <input name="next" type="hidden" value={next} />
            <Input
              autoComplete="email"
              label="อีเมล"
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
            <Button type="submit">เข้าสู่ระบบ</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-muted">
            ยังไม่มีบัญชี?{" "}
            <Link
              className="font-bold text-primary-700 hover:text-primary-600"
              href={`/register?next=${encodeURIComponent(next)}`}
            >
              สมัครสมาชิก
            </Link>
          </p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
