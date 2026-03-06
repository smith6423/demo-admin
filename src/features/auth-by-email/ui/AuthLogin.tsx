"use client";
import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { CustomTextField } from "@/shared/ui";
import { authApi, ApiError, type LoginResponse } from "@/shared/api";
import OtpVerifyDialog from "./OtpVerifyDialog";
import OtpRegisterDialog from "./OtpRegisterDialog";
import ChangePasswordDialog from "./ChangePasswordDialog";

interface Props {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthLogin = ({ title, subtitle, subtext }: Props) => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guestBlocked, setGuestBlocked] = useState(false);

  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerSecret, setRegisterSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [regToken, setRegToken] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [showChangePwDialog, setShowChangePwDialog] = useState(false);

  const redirectToDashboard = () => {
    router.push("/");
    router.refresh();
  };

  const handleLoginResponse = (data: LoginResponse, closePrev?: () => void) => {
    if (data.mustChangePassword) {
      closePrev?.();
      setShowChangePwDialog(true);
    } else if (data.guestBlocked) {
      closePrev?.();
      setGuestBlocked(true);
    } else {
      redirectToDashboard();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuestBlocked(false);
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);

      if (data.user) {
        handleLoginResponse(data);
      } else if (data.guestBlocked) {
        setGuestBlocked(true);
      } else if (data.requiresOtp) {
        setShowOtpDialog(true);
      } else if (data.needsOtpRegistration) {
        await handleOtpSetup();
      } else {
        setError(data.message ?? "로그인에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSetup = async () => {
    try {
      const gdata = await authApi.generateOtp(email, password);
      setRegisterSecret(gdata.base32);
      try {
        const QRCode = (await import("qrcode")).default;
        setQrDataUrl(await QRCode.toDataURL(gdata.otpauth_url, { width: 200 }));
      } catch (e) {
        console.error("QR 생성 실패", e);
      }
      setShowRegisterDialog(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "OTP 생성 실패");
    }
  };

  const handleOtpSubmit = async () => {
    setIsLoading(true);
    setOtpError(null);
    try {
      const data = await authApi.login(email, password, otp);
      if (data.user) {
        handleLoginResponse(data, () => setShowOtpDialog(false));
      } else {
        setOtpError(data.message || "유효하지 않은 OTP입니다.");
      }
    } catch {
      setOtpError("네트워크 오류");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterConfirm = async () => {
    if (!registerSecret) return setRegisterError("시크릿 없음");
    setIsLoading(true);
    setRegisterError(null);
    try {
      await authApi.verifyOtpRegister({ email, password, token: regToken, secret: registerSecret });
      setShowRegisterDialog(false);
      setError("OTP 등록 완료 — 다시 로그인 해주세요");
    } catch (e) {
      setRegisterError(e instanceof ApiError ? e.message : "유효하지 않은 OTP입니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {title && (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      )}
      {subtext}

      {guestBlocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>접근 제한</strong>
          <br />
          게스트 계정은 관리자 승인 후 로그인 가능합니다.
          <br />
          관리자에게 권한 변경을 요청해 주세요.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" mb="5px">
            Email
          </Typography>
          <CustomTextField
            id="email"
            type="email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </Box>
        <Box my="25px">
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="password" mb="5px">
            Password
          </Typography>
          <CustomTextField
            id="password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
        </Box>
      </Stack>

      <Box>
        <Button color="primary" variant="contained" size="large" fullWidth type="submit" disabled={isLoading}>
          {isLoading ? "로그인 중..." : "Sign In"}
        </Button>
      </Box>
      {subtitle}

      <OtpVerifyDialog
        open={showOtpDialog}
        otp={otp}
        error={otpError}
        loading={isLoading}
        onOtpChange={setOtp}
        onConfirm={handleOtpSubmit}
        onClose={() => { setShowOtpDialog(false); setOtpError(null); }}
      />

      <OtpRegisterDialog
        open={showRegisterDialog}
        qrDataUrl={qrDataUrl}
        registerSecret={registerSecret}
        regToken={regToken}
        error={registerError}
        loading={isLoading}
        onTokenChange={setRegToken}
        onConfirm={handleRegisterConfirm}
        onClose={() => { setShowRegisterDialog(false); setRegisterError(null); }}
      />

      <ChangePasswordDialog
        open={showChangePwDialog}
        onSuccess={redirectToDashboard}
      />
    </form>
  );
};

export default AuthLogin;
