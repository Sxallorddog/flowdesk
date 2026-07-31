import type { Role } from "./types";

export type Permission = "read" | "write" | "delete_records" | "manage_members" | "manage_roles" | "manage_workspace" | "delete_workspace";

const grants: Record<Role, Permission[]> = {
  owner: ["read", "write", "delete_records", "manage_members", "manage_roles", "manage_workspace", "delete_workspace"],
  admin: ["read", "write", "delete_records", "manage_members", "manage_workspace"],
  member: ["read", "write"],
};

export function can(role: Role, permission: Permission) {
  return grants[role].includes(permission);
}

export function assertPermission(role: Role, permission: Permission) {
  if (!can(role, permission)) throw new Error("Недостатньо прав для цієї дії");
}
