"use server";

import { cookies } from "next/headers";

const allowedRoles = new Set(["customer", "admin", "master_admin"]);

export async function selectSessionRole(formData: FormData) {
  const requestedRole = formData.get("role");

  if (typeof requestedRole !== "string" || !allowedRoles.has(requestedRole)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set("fatguydiscounts-role", requestedRole, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}