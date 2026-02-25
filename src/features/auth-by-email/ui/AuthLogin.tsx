"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CustomTextField } from "@/shared/ui";

interface loginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [registerSecret, setRegisterSecret] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [regToken, setRegToken] = useState("")
  const [error, setError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json()
      if (res.ok && data.user) {
        router.push("/");
        router.refresh();
      } else if (data.requiresOtp) {
        setShowOtpDialog(true)
      } else if (data.needsOtpRegistration) {
        // start registration flow: request secret via public endpoint
        const gen = await fetch('/api/auth/otp/generate-public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        const gdata = await gen.json()
        if (gen.ok && gdata.base32) {
          setRegisterSecret(gdata.base32)
          // build QR DataURL client-side
          try {
            const QRCode = (await import('qrcode')).default
            const dataUrl = await QRCode.toDataURL(gdata.otpauth_url, { width: 200 })
            setQrDataUrl(dataUrl)
          } catch (e) {
            console.error('QR 생성 실패', e)
          }
          setShowRegisterDialog(true)
        } else {
          setError(gdata.message || 'OTP 생성 실패')
        }
      } else {
        setError(data.message ?? "로그인에 실패했습니다.")
      }
    } catch (e) {
      console.error(e)
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    setIsLoading(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, otp }) })
      if (res.ok) {
        setShowOtpDialog(false)
        setOtpError(null)
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setOtpError(data.message || '유효하지 않은 OTP입니다.')
      }
    } catch (e) {
      setOtpError('네트워크 오류')
    } finally { setIsLoading(false) }
  }

  const handleRegisterConfirm = async () => {
    if (!registerSecret) return setRegisterError('시크릿 없음')
    setIsLoading(true)
    setRegisterError(null)
    try {
      const res = await fetch('/api/auth/otp/verify-public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, token: regToken, secret: registerSecret }) })
      const data = await res.json()
      if (res.ok) {
        setShowRegisterDialog(false)
        setRegisterError(null)
        setError('OTP 등록 완료 — 다시 로그인 해주세요')
      } else {
        setRegisterError(data.message || '유효하지 않은 OTP입니다.')
      }
    } catch (e) {
      setRegisterError('네트워크 오류')
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack>
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="email"
            mb="5px"
          >
            Email
          </Typography>
          <CustomTextField
            id="email"
            type="email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
          />
        </Box>
        <Box my="25px">
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="password"
            mb="5px"
          >
            Password
          </Typography>
          <CustomTextField
            id="password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
          />
        </Box>
        {/* OTP is handled in modal dialogs */}
      </Stack>
      <Box>
        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "로그인 중..." : "Sign In"}
        </Button>
      </Box>
      {subtitle}

      <Dialog open={showOtpDialog} onClose={() => { setShowOtpDialog(false); setOtpError(null); }}>
        <DialogTitle>Enter OTP</DialogTitle>
        <DialogContent>
          {otpError && <Alert severity="error" sx={{ mt: 2 }}>{otpError}</Alert>}
          <TextField label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} fullWidth sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowOtpDialog(false); setOtpError(null); }}>취소</Button>
          <Button onClick={handleOtpSubmit} variant="contained">확인</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRegisterDialog} onClose={() => { setShowRegisterDialog(false); setRegisterError(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Register OTP</DialogTitle>
        <DialogContent>
          {qrDataUrl && <Box sx={{ textAlign: 'center' }}><img src={qrDataUrl} alt="qr" style={{ width: 200, height: 200 }} /></Box>}
          {registerSecret && <Typography variant="body2" sx={{ mt: 1 }}>Secret: {registerSecret}</Typography>}
          {registerError && <Alert severity="error" sx={{ mt: 2 }}>{registerError}</Alert>}
          <TextField label="OTP 코드" value={regToken} onChange={(e) => setRegToken(e.target.value)} fullWidth sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowRegisterDialog(false); setRegisterError(null); }}>취소</Button>
          <Button onClick={handleRegisterConfirm} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>
    </form>
  );
};

export default AuthLogin;
