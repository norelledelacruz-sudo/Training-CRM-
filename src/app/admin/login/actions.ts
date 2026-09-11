"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");
  const from = (formData.get("from") as string) || "/admin";

  if (
    typeof password !== "string" ||
    !process.env.ADMIN_PASSWORD ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    redirect(`/admin/login?error=1&from=${encodeURIComponent(from)}`);
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect(from);
}
