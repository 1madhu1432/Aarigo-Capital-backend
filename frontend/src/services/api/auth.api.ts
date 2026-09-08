import http, { type ApiResponse } from '../http';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COLLECTION_AGENT' | 'FINANCE_MANAGER' | 'AUDITOR';
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
  expiresIn: string;
}

export const authApi = {
  login: async (credentials: LoginRequest | string, password?: string): Promise<ApiResponse<LoginResponse>> => {
    const creds: LoginRequest =
      typeof credentials === 'string'
        ? { email: credentials, password: password || '' }
        : credentials;
    const res = await http.post<LoginResponse>('/auth/login', creds);
    if (res.data?.token) {
      localStorage.setItem('aarigo_auth_token', res.data.token);
    }
    return res;
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      return await http.post<{ message: string }>('/auth/logout');
    } finally {
      localStorage.removeItem('aarigo_auth_token');
    }
  },

  me: (): Promise<ApiResponse<{ user: AuthUser }>> =>
    http.get<{ user: AuthUser }>('/auth/me'),

  getMe: async (): Promise<AuthUser | null> => {
    try {
      const res = await http.get<any>('/auth/me');
      return (res.data?.user || res.data) as AuthUser;
    } catch {
      return null;
    }
  },
};

export default authApi;
