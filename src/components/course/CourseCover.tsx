import Image from "next/image";

type CourseCoverProps = {
  title: string;
  subject: string;
  src?: string | null;
  priority?: boolean;
};

export function CourseCover({
  title,
  subject,
  src,
  priority,
}: CourseCoverProps) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-primary-800">
      <Image
        src={src ?? "/course-covers/math-a-level.svg"}
        alt={`${title} cover`}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 420px, (min-width: 640px) 220px, 100vw"
        className="object-cover"
        unoptimized
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-900/85 to-transparent p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-100">
          {subject}
        </p>
        <p className="mt-1 line-clamp-2 font-heading text-lg font-bold">
          {title}
        </p>
      </div>
    </div>
  );
}
