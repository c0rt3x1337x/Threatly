export interface User {
  _id: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'simple' | 'premium';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  firstName?: string;
  lastName?: string;
  lastLogin?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}
