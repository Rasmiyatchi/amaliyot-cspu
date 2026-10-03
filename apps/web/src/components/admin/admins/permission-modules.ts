/**
 * Admin modul ruxsatlari — backend `ADMIN_PERMISSIONS` / `require_permission` nomlari bilan bir xil.
 * Bo'sh ro'yxat = HECH QANDAY modulga kirish yo'q (faqat bosh sahifa).
 */
export const PERMISSION_MODULE_IDS = [
  "structure",
  "practice",
  "contracts",
  "supervisors",
  "partners",
  "monitoring",
  "inquiries",
  "system",
] as const;

export type PermissionModuleId = (typeof PERMISSION_MODULE_IDS)[number];

export function isPermissionModuleId(id: string): id is PermissionModuleId {
  return (PERMISSION_MODULE_IDS as readonly string[]).includes(id);
}

export function permissionNameKey(id: PermissionModuleId): string {
  return `adminsAdminFormDialog.modules.${id}.name`;
}

export function permissionDescKey(id: PermissionModuleId): string {
  return `adminsAdminFormDialog.modules.${id}.desc`;
}
