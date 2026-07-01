import { navGroups, navItems, type NavGroup } from '@/data/admin';

export const ADMIN_PERMISSION_STORAGE_KEY = 'farm-admin-permissions';
export const ADMIN_ROLE_CODES_STORAGE_KEY = 'farm-admin-role-codes';
export const ADMIN_ROLE_NAMES_STORAGE_KEY = 'farm-admin-role-names';

export const ADMIN_PERMISSION_KEYS = navItems.map((item) => item.key);

const IMPLIED_ADMIN_PERMISSIONS: Record<string, string[]> = {
  products: ['categories'],
  orders: ['withdraws'],
  leaders: ['pickup-points', 'commissions'],
};

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys.filter(Boolean)));
}

export function expandAdminPermissionKeys(keys: string[]): string[] {
  const expanded = new Set(keys);
  for (const key of keys) {
    for (const implied of IMPLIED_ADMIN_PERMISSIONS[key] ?? []) {
      if (ADMIN_PERMISSION_KEYS.includes(implied)) {
        expanded.add(implied);
      }
    }
  }
  return Array.from(expanded);
}

export function normalizeAdminPermissionKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueKeys(
      value
        .map((item) => String(item).trim())
        .filter((item) => ADMIN_PERMISSION_KEYS.includes(item)),
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeAdminPermissionKeys(parsed);
    } catch {
      return uniqueKeys(
        trimmed
          .split(',')
          .map((item) => item.trim())
          .filter((item) => ADMIN_PERMISSION_KEYS.includes(item)),
      );
    }
  }

  return [];
}

export function readStoredPermissionKeys(): string[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(ADMIN_PERMISSION_STORAGE_KEY);
  if (raw == null) {
    return null;
  }

  try {
    return normalizeAdminPermissionKeys(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function storeAdminSessionPermissionKeys(keys: string[]) {
  localStorage.setItem(ADMIN_PERMISSION_STORAGE_KEY, JSON.stringify(uniqueKeys(keys)));
}

export function clearAdminSessionPermissions() {
  localStorage.removeItem(ADMIN_PERMISSION_STORAGE_KEY);
  localStorage.removeItem(ADMIN_ROLE_CODES_STORAGE_KEY);
  localStorage.removeItem(ADMIN_ROLE_NAMES_STORAGE_KEY);
}

export function filterNavGroupsByPermissions(permissionKeys: string[] | null | undefined): NavGroup[] {
  if (permissionKeys == null) {
    return navGroups;
  }

  const allowed = new Set(expandAdminPermissionKeys(permissionKeys));
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowed.has(item.key)),
    }))
    .filter((group) => group.items.length > 0);
}

export function findFirstAccessiblePath(permissionKeys: string[] | null | undefined): string {
  const groups = filterNavGroupsByPermissions(permissionKeys);
  return groups[0]?.items[0]?.to ?? '/dashboard';
}

export function canAccessPermission(permissionKey: string | undefined, permissionKeys: string[] | null | undefined): boolean {
  if (!permissionKey) {
    return true;
  }

  if (permissionKeys == null) {
    return true;
  }

  if (permissionKeys.length === 0) {
    return false;
  }

  return new Set(expandAdminPermissionKeys(permissionKeys)).has(permissionKey);
}

