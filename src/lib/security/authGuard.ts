import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Validates that a user is currently logged in.
 * Returns the authenticated user or null.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    if (!session || !session.user) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as any).role || "CUSTOMER",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Enforces that the current user has one of the required roles.
 * Throws an error or returns false if unauthorized.
 */
export async function assertRole(allowedRoles: string[]): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Anda tidak memiliki akses ke fitur ini");
  }

  return user;
}

/**
 * Enforces Row-Level Security (RLS) / Anti-IDOR:
 * Ensures the resource belongs to the current user, OR the user is an ADMIN.
 */
export async function assertResourceOwnerOrAdmin(resourceUserId: string): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu");
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(user.role);
  if (!isAdmin && user.id !== resourceUserId) {
    throw new Error("Forbidden: Anda tidak berhak mengakses data pengguna lain");
  }

  return user;
}
