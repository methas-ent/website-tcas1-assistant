"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  clearSession,
  hashPassword,
  normalizeEmail,
  normalizeText,
  verifyPassword,
} from "@/lib/auth";
import prisma from "@/lib/db";

function safeNext(nextValue: FormDataEntryValue | null) {
  const next = normalizeText(nextValue);

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

function safeAdminNext(next: string) {
  return next.startsWith("/admin") || next.startsWith("/watch/") ? next : "/admin";
}

export async function loginStudentAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const next = safeNext(formData.get("next"));

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "STUDENT" || !verifyPassword(password, user.passwordHash)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  await createSession(user.id);
  redirect(next);
}

export async function loginAdminAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const next = safeNext(formData.get("next"));

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash)) {
    redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  await createSession(user.id);
  redirect(safeAdminNext(next));
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function registerStudentAction(formData: FormData) {
  const name = normalizeText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const next = safeNext(formData.get("next"));

  if (!name || !email.includes("@") || password.length < 8) {
    redirect(`/register?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect(`/register?error=exists&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "STUDENT",
    },
  });

  await createSession(user.id);
  redirect(next);
}
