export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: Omit<User, "password">;
  };
}