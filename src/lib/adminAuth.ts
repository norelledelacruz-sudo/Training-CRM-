// Placeholder trainer auth: a single shared password stored in an httpOnly
// cookie. Fine for an internal Phase 1 pilot with a handful of trainers;
// swap for Google OAuth restricted to the Homeaglow domain before wider use.
export const ADMIN_COOKIE = "training_crm_admin";

export function isValidAdminCookie(value: string | undefined): boolean {
  return Boolean(
    value && process.env.ADMIN_PASSWORD && value === process.env.ADMIN_PASSWORD
  );
}
