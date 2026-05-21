import Link from "next/link";
import { registerStudentAction } from "@/lib/auth-actions";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type RegisterPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

const errorMessages: Record<string, string> = {
  exists: "อีเมลนี้มีบัญชีอยู่แล้ว",
  invalid: "กรุณากรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร",
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const next = searchParams?.next ?? "/checkout";
  const error = searchParams?.error
    ? errorMessages[searchParams.error] ?? "สมัครสมาชิกไม่สำเร็จ"
    : null;

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-160px)] max-w-md place-items-center px-page py-10">
        <Card className="w-full">
          <p className="text-sm font-bold text-primary-700">Student Register</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink" >
            สมัครบัญชีนักเรียน
          </h1>
          <form action={registerStudentAction} className="mt-6 grid gap-4">
            <input name="next" type="hidden" value={next} />
            <Input
              autoComplete="name"
              label="ชื่อผู้เรียน"
              name="name"
              required
            />
            <Input
              autoComplete="email"
              label="อีเมล"
              name="email"
              required
              type="email"
            />
            <Input
              autoComplete="new-password"
              hint="อย่างน้อย 8 ตัวอักษร"
              label="รหัสผ่าน"
              minLength={8}
              name="password"
              required
              type="password"
            />
            {error ? (
              <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit">สมัครสมาชิก</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-muted">
            มีบัญชีแล้ว?{" "}
            <Link
              className="font-bold text-primary-700 hover:text-primary-600"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
