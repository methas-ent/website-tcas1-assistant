import { redirect } from "next/navigation";

type AdminPackagesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AdminPackagesPage({
  searchParams,
}: AdminPackagesPageProps) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  redirect(`/admin/videos${query ? `?${query}` : ""}`);
}
