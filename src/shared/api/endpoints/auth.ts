import { apiClient, ApiError } from "@/shared/api";
import type { ChangePasswordInput, RegisterInput } from "@/shared/lib/schemas";

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export interface LoginResponse {
  user?: { id: string; email: string; name: string; role: string };
  mustChangePassword?: boolean;
  requiresOtp?: boolean;
  needsOtpRegistration?: boolean;
  guestBlocked?: boolean;
  message?: string;
}

export interface OtpGenerateResponse {
  base32: string;
  otpauth_url: string;
}

export interface OtpVerifyResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Auth API 모듈
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * 로그인 (비밀번호 단계 또는 OTP 포함)
   * 서버가 200 외에도 requiresOtp 등을 반환하므로 raw fetch 사용
   */
  login: async (
    email: string,
    password: string,
    otp?: string
  ): Promise<LoginResponse> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(otp ? { otp } : {}) }),
    });
    return res.json();
  },

  /** 회원가입 */
  register: (data: RegisterInput) =>
    apiClient<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** 비밀번호 변경 */
  changePassword: (data: ChangePasswordInput) =>
    apiClient<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** 로그아웃 */
  logout: () => apiClient<void>("/api/auth/logout", { method: "POST" }),

  /** OTP 시크릿 생성 (최초 등록용) */
  generateOtp: (email: string, password: string) =>
    apiClient<OtpGenerateResponse>("/api/auth/otp/generate-public", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** OTP 등록 확인 */
  verifyOtpRegister: (payload: {
    email: string;
    password: string;
    token: string;
    secret: string;
  }) =>
    apiClient<OtpVerifyResponse>("/api/auth/otp/verify-public", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export { ApiError };
