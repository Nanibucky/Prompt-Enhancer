
export interface User {
  email: string;
  password: string;
  apiKey?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
