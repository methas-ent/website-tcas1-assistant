import Link from "next/link";
import { cn } from "@/components/ui/cn";

type FooterLink = {
  href: string;
  label: string;
};

export type PublicFooterProps = {
  links?: FooterLink[];
  className?: string;
};

const defaultLinks: FooterLink[] = [
  { href: "/", label: "หน้าแรก" },
  { href: "/courses", label: "คอร์ส/แพ็กเกจ" },
  { href: "/cart", label: "ตะกร้า" },
];

export function PublicFooter({
  links = defaultLinks,
  className,
}: PublicFooterProps) {
  return (
    <footer className={cn("border-t border-line bg-surface", className)}>
      <div className="mx-auto grid max-w-7xl gap-6 px-page py-8 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-heading text-lg font-bold text-ink">VDO Knowledge Academy</p>
          <p className="mt-1 text-sm text-ink-muted">
            แพลตฟอร์มเรียนออนไลน์สำหรับคอร์สวิดีโอและแพ็กเกจคอร์ส
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-bold" aria-label="เมนูท้ายเว็บ">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="text-ink-muted transition hover:text-primary-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
