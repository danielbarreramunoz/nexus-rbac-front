export interface RoleRef {
  id: string;
  name: string;
}

export interface PermissionRef {
  id: string;
  code: string;
  description: string | null;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  isProtected: boolean;
  tenantId: string | null;
  permissions: PermissionRef[];
}

export interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isProtected: boolean;
  tenantId: string | null;
  roles: RoleRef[];
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  tenantId: string | null;
}
