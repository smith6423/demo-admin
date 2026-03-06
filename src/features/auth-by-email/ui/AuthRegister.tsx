"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
  TextField,
} from "@mui/material";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/shared/lib/schemas";
import { authApi, ApiError } from "@/shared/api";

interface Props {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthRegister = ({ title, subtitle, subtext }: Props) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const json = await authApi.register(data);
      setSuccessMessage(json.message ?? "회원가입이 완료되었습니다.");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "회원가입에 실패했습니다.");
    }
  };

  if (successMessage) {
    return (
      <Box mt={2}>
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          관리자 승인 후 로그인할 수 있습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {title && (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      )}
      {subtext}

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Stack spacing={2.5} mb={3}>
        {/* 이름 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="name" mb="5px" display="block">
            이름
          </Typography>
          <TextField
            id="name"
            variant="outlined"
            fullWidth
            size="small"
            placeholder="홍길동"
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register("name")}
          />
        </Box>

        {/* 이메일 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" mb="5px" display="block">
            이메일
          </Typography>
          <TextField
            id="email"
            type="email"
            variant="outlined"
            fullWidth
            size="small"
            placeholder="example@email.com"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register("email")}
          />
        </Box>

        {/* 비밀번호 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="password" mb="5px" display="block">
            비밀번호
          </Typography>
          <TextField
            id="password"
            type={showPw ? "text" : "password"}
            variant="outlined"
            fullWidth
            size="small"
            placeholder="8자 이상, 영문+숫자+특수문자 조합"
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPw((v) => !v)} edge="end">
                    {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register("password")}
          />
        </Box>

        {/* 비밀번호 확인 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="confirmPassword" mb="5px" display="block">
            비밀번호 확인
          </Typography>
          <TextField
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            variant="outlined"
            fullWidth
            size="small"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end">
                    {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register("confirmPassword")}
          />
        </Box>

        <Typography variant="caption" color="textSecondary">
          가입 후 관리자 승인이 완료되면 로그인할 수 있습니다.
        </Typography>
      </Stack>

      <Button
        color="primary"
        variant="contained"
        size="large"
        fullWidth
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "처리 중..." : "회원가입"}
      </Button>

      {subtitle}
    </form>
  );
};

export default AuthRegister;
