export type UserRole =
  | 'administrator'
  | 'doctor'
  | 'nurse'
  | 'medical_technologist'
  | 'staff';

export interface DirectusUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  role: string | UserRole;
  status: 'active' | 'inactive' | 'suspended';
  last_access: string | null;
  last_page: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires: number;
  expires_at: string;
}

export interface CurrentUser extends DirectusUser {
  roleName: UserRole;
  permissions: string[];
}
