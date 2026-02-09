/**
 * Admin authorization helper.
 *
 * Reads the comma-separated ADMIN_USER_IDS env var and checks membership.
 */

const adminUserIds: string[] = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

export function isAdmin(userId: string): boolean {
  return adminUserIds.includes(userId)
}
